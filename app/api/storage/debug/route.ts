/**
 * WebDAV 读取诊断端点（管理员 + curl 直连）
 * GET /api/storage/debug?path=pages/hello-world/index.html
 */
import { NextResponse } from 'next/server'
import https from 'node:https'
import { execSync } from 'node:child_process'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { joinPath } from '@/lib/storage/path'

export const dynamic = 'force-dynamic'

type R = Record<string, unknown>

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })

  const url = new URL(req.url)
  const relPath = joinPath(url.searchParams.get('path') ?? 'pages/hello-world/index.html')
  const results: R = { path: relPath }

  if (!isWebDavConfigured()) return NextResponse.json({ error: 'WebDAV 未配置' })

  const webdavBase = process.env.WEBDAV_URL!.replace(/\/+$/, '')
  const auth = `Basic ${Buffer.from(`${process.env.WEBDAV_USER}:${process.env.WEBDAV_PASS}`).toString('base64')}`
  const encodedPath = relPath.split('/').map(encodeURIComponent).join('/')
  const fullUrl = `${webdavBase}/${encodedPath}`
  results.url = fullUrl

  // 1. stat
  try {
    const start = Date.now()
    const statRaw = await getWebDavClient().stat(relPath)
    results.stat = { ok: true, ms: Date.now() - start, data: JSON.stringify(statRaw).slice(0, 300) }
  } catch (e) { results.stat = { ok: false, error: String(e).slice(0, 200) } }

  // 2. curl 直连 (绕过所有 Node.js HTTP 层)
  try {
    const start = Date.now()
    const curlCmd = `curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: ${auth}' '${fullUrl}'`
    const statusCode = execSync(curlCmd, { timeout: 10_000, encoding: 'utf-8' }).trim()
    results.curl_status = { ok: true, status: Number(statusCode), ms: Date.now() - start }
  } catch (e) { results.curl_status = { ok: false, error: String(e).slice(0, 200) } }

  // 3. curl 下载完整内容
  try {
    const start = Date.now()
    const curlCmd = `curl -s -H 'Authorization: ${auth}' '${fullUrl}'`
    const content = execSync(curlCmd, { timeout: 10_000, encoding: 'utf-8' })
    results.curl_body = { ok: true, ms: Date.now() - start, len: content.length, preview: content.slice(0, 200) }
  } catch (e) { results.curl_body = { ok: false, error: String(e).slice(0, 200) } }

  // 4. Node.js https GET (headers only, 不读 body)
  try {
    const start = Date.now()
    const resp = await new Promise<{ status: number; headers: Record<string, string> }>((resolve, reject) => {
      const r = https.get(fullUrl, { headers: { Authorization: auth } }, (res) => {
        resolve({ status: res.statusCode ?? 0, headers: res.headers as Record<string, string> })
        res.resume()
      })
      r.on('error', reject)
      r.setTimeout(5_000, () => r.destroy(new Error('timeout')))
    })
    results.httpsHeaders = { ok: true, ms: Date.now() - start, status: resp.status, headers: resp.headers }
  } catch (e) { results.httpsHeaders = { ok: false, error: String(e).slice(0, 200) } }

  // 5. https get 完整读取
  try {
    const start = Date.now()
    const content = await new Promise<Buffer>((resolve, reject) => {
      const r = https.get(fullUrl, { headers: { Authorization: auth } }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      r.on('error', reject)
      r.setTimeout(5_000, () => r.destroy(new Error('timeout')))
    })
    results.httpsFull = { ok: true, ms: Date.now() - start, len: content.length, preview: content.toString('utf8').slice(0, 200) }
  } catch (e) { results.httpsFull = { ok: false, error: String(e).slice(0, 200) } }

  // 6. 全局 fetch (headers only)
  try {
    const start = Date.now()
    const resp = await fetch(fullUrl, { headers: { Authorization: auth } })
    results.fetchHeaders = { ok: resp.ok, status: resp.status, ms: Date.now() - start, contentType: resp.headers.get('content-type'), contentLength: resp.headers.get('content-length') }
    await resp.body?.cancel()
  } catch (e) { results.fetchHeaders = { ok: false, error: String(e).slice(0, 200) } }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
