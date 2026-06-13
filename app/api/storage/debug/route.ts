/**
 * WebDAV 读取诊断端点（仅管理员可调用）
 * GET /api/storage/debug?path=pages/hello-world/index.html
 *
 * 依次尝试所有可能的文件读取方式并报告结果。
 * 用完即删。
 */
import { NextResponse } from 'next/server'
import https from 'node:https'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { joinPath } from '@/lib/storage/path'

export const dynamic = 'force-dynamic'

function httpsGet(url: string, auth: string, timeoutMs = 10_000): Promise<{ status: number; bodyLen: number; bodyPreview: string; ms: number; error?: string }> {
  const start = Date.now()
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { Authorization: auth, Accept: '*/*', 'User-Agent': 'webdav-client/5.10.0' },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        resolve({ status: res.statusCode ?? 0, bodyLen: buf.length, bodyPreview: buf.toString('utf8').slice(0, 200), ms: Date.now() - start })
      })
      res.on('error', (e) => resolve({ status: 0, bodyLen: 0, bodyPreview: '', ms: Date.now() - start, error: `res error: ${e.message}` }))
    })
    req.on('error', (e) => resolve({ status: 0, bodyLen: 0, bodyPreview: '', ms: Date.now() - start, error: `req error: ${e.message}` }))
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timeout')); })
  })
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })

  const url = new URL(req.url)
  const rawPath = url.searchParams.get('path') ?? 'pages/hello-world/index.html'
  const relPath = joinPath(rawPath)

  const results: Record<string, unknown> = { path: relPath }

  // 1. 环境变量检查
  results.env = {
    WEBDAV_URL: (process.env.WEBDAV_URL ?? '').substring(0, 30) + '...',
    WEBDAV_USER: process.env.WEBDAV_USER ? '***' : '(缺失)',
    WEBDAV_PASS: process.env.WEBDAV_PASS ? '***' : '(缺失)',
    configured: isWebDavConfigured(),
  }

  if (!isWebDavConfigured()) {
    return NextResponse.json(results)
  }

  const webdavBase = process.env.WEBDAV_URL!.replace(/\/+$/, '')
  const auth = `Basic ${Buffer.from(`${process.env.WEBDAV_USER}:${process.env.WEBDAV_PASS}`).toString('base64')}`
  const encodedPath = relPath.split('/').map(encodeURIComponent).join('/')
  const fullUrl = `${webdavBase}/${encodedPath}`

  results.url = fullUrl

  // 2. webdav 库 stat
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const statRaw = await client.stat(relPath)
    results.stat = { ok: true, ms: Date.now() - start, data: JSON.stringify(statRaw).slice(0, 300) }
  } catch (e) {
    results.stat = { ok: false, error: String(e) }
  }

  // 3. webdav 库 getFileContents (format: text)
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const content = await client.getFileContents(relPath, { format: 'text' }) as string
    results.getFileContents_text = { ok: true, ms: Date.now() - start, len: content.length, preview: content.slice(0, 200) }
  } catch (e) {
    results.getFileContents_text = { ok: false, error: String(e).slice(0, 300) }
  }

  // 4. webdav 库 getFileContents (format: binary)
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const buf = await client.getFileContents(relPath, { format: 'binary' }) as ArrayBuffer
    results.getFileContents_binary = { ok: true, ms: Date.now() - start, len: buf.byteLength }
  } catch (e) {
    results.getFileContents_binary = { ok: false, error: String(e).slice(0, 300) }
  }

  // 5. webdav 库 customRequest GET
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const resp = await client.customRequest(relPath, { method: 'GET' })
    const text = await resp.text()
    results.customRequest_GET = { ok: resp.status < 400, status: resp.status, ms: Date.now() - start, len: text.length, preview: text.slice(0, 200) }
  } catch (e) {
    results.customRequest_GET = { ok: false, error: String(e).slice(0, 300) }
  }

  // 6. Node.js https GET (Authorization header)
  results.httpsGet_header = await httpsGet(fullUrl, auth)

  // 7. Node.js https GET (credentials in URL)
  try {
    const user = encodeURIComponent(process.env.WEBDAV_USER!)
    const pass = encodeURIComponent(process.env.WEBDAV_PASS!)
    const host = new URL(webdavBase).host
    const pathPart = new URL(webdavBase).pathname
    const urlWithCreds = `https://${user}:${pass}@${host}${pathPart}/${encodedPath}`
    results.httpsGet_urlCreds = await httpsGet(urlWithCreds, '')
  } catch (e) {
    results.httpsGet_urlCreds = { error: String(e) }
  }

  // 8. 全局 fetch GET
  try {
    const start = Date.now()
    const resp = await fetch(fullUrl, { headers: { Authorization: auth } })
    const buf = await resp.arrayBuffer()
    results.globalFetch = { ok: resp.ok, status: resp.status, ms: Date.now() - start, len: buf.byteLength }
  } catch (e) {
    results.globalFetch = { ok: false, error: String(e).slice(0, 300) }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
