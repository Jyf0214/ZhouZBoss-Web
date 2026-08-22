/**
 * 存储池 / WebDAV 文件下载代理
 *
 * GET /files/[...path]
 *
 * 诊断结论:Koofr WebDAV 的 GET 响应头正常(200, Content-Length)但 body 读取全部
 * 报 aborted。所有 fetch/node-fetch/@buttercup/fetch/node:https 均失败。
 * PROPFIND(stat) 正常。api.koofr.net 从 Vercel 不可达(ENOTFOUND)。
 *
 * 解决方案:用 Node.js 原生 http2 模块直接连 Koofr WebDAV 下载文件。
 * HTTP/2 使用完全不同的帧协议，绕过可能导致 HTTP/1.1 body 中断的中间层。
 * 若 http2 失败，回退到 node:https 带 PROPFIND 风格头部。
 */
import { type NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import http2 from 'node:http2'
import { getSession, isRootRole } from '@/lib/auth'
import { getStorageProvider, isStorageConfigured, type StorageProvider } from '@/lib/storage/storage-provider'
import { checkAccess } from '@/lib/storage/acl'
import { isValidPath, joinPath } from '@/lib/storage/path'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import type { FileStat, ResponseDataDetailed } from 'webdav'
import { getTranslate } from '@/i18n/translate'

/** 文件下载频率限制:每 IP 每分钟最多 60 次请求(含公开/私有) */
const DOWNLOAD_RATE_LIMIT = 60
const DOWNLOAD_RATE_WINDOW_MS = 60_000

/** 检查文件下载频率限制,超限时返回 429 响应;通过则返回 null */
function checkDownloadRateLimit(req: NextRequest): NextResponse | null {
  const ip = getClientIp(req)
  const { allowed, retryAfterMs } = rateLimit(`${ip}:file-download`, DOWNLOAD_RATE_LIMIT, DOWNLOAD_RATE_WINDOW_MS)
  if (!allowed) {
    return NextResponse.json(
      { error: getTranslate('lib.files.rateLimited') },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    )
  }
  return null
}

interface RouteParams { path: string[] }
interface DownloadResult { ok: boolean; body: Buffer; method: string; error?: string }

function unwrapStat(raw: FileStat | ResponseDataDetailed<FileStat>): FileStat {
  const d = (raw as ResponseDataDetailed<FileStat>).data
  if (typeof d === 'object' && d !== null && 'filename' in d) return d
  return raw as FileStat
}

/** HTTP/2 直连下载:使用完全不同的帧协议绕过 HTTP/1.1 body 中断问题 */
function http2Get(webdavBase: string, relPath: string, auth: string): Promise<DownloadResult> {
  return new Promise((resolve) => {
    const start = Date.now()
    const urlObj = new URL(webdavBase)
    const encodedPath = relPath.split('/').map(encodeURIComponent).join('/')
    const session = http2.connect(urlObj.origin)
    session.on('error', (err) => {
      session.close()
      resolve({ ok: false, body: Buffer.alloc(0), method: 'http2', error: `session: ${err.message}` })
    })

    const req = session.request({
      ':path': `${urlObj.pathname}/${encodedPath}`,
      ':method': 'GET',
      'authorization': auth,
      'user-agent': 'webdav-client/5.10.0',
      'accept': '*/*',
    })

    const chunks: Buffer[] = []
    req.on('response', (headers) => {
      const status = Number(headers[':status'] ?? 500)
      if (status >= 400) {
        req.resume()
        session.close()
        resolve({ ok: false, body: Buffer.alloc(0), method: 'http2', error: `upstream ${status}` })
        return
      }
    })
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      console.warn(`[files] http2 完成 path="${relPath}" size=${body.length} 耗时=${Date.now() - start}ms`)
      session.close()
      resolve({ ok: body.length > 0, body, method: 'http2' })
    })
    req.on('error', (err) => {
      session.close()
      resolve({ ok: false, body: Buffer.alloc(0), method: 'http2', error: err.message })
    })
    req.setTimeout(15_000, () => { req.close(http2.constants.NGHTTP2_INTERNAL_ERROR) })
    req.end()
  })
}

/** node:https 回退:带 PROPFIND 风格头部(Content-Type + Depth)尝试绕过 */
function httpsFallback(webdavBase: string, relPath: string, auth: string): Promise<DownloadResult> {
  return new Promise((resolve) => {
    const start = Date.now()
    const encodedPath = relPath.split('/').map(encodeURIComponent).join('/')
    const url = `${webdavBase.replace(/\/+$/, '')}/${encodedPath}`
    const req = https.get(url, {
      headers: {
        Authorization: auth,
        'User-Agent': 'webdav-client/5.10.0',
        Accept: '*/*',
        'Accept-Encoding': 'identity',
        // PROPFIND 成功时带的头部,尝试让 GET 也成功
        'Content-Type': 'text/xml',
        Depth: '0',
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        console.warn(`[files] https 完成 path="${relPath}" status=${res.statusCode} size=${body.length} 耗时=${Date.now() - start}ms`)
        resolve({ ok: body.length > 0, body, method: 'https' })
      })
      res.on('error', (e) => {
        // 即使出错也尝试使用已收集的数据
        const partial = Buffer.concat(chunks)
        if (partial.length > 0) {
          console.warn(`[files] https 部分数据 path="${relPath}" size=${partial.length} error=${e.message}`)
          resolve({ ok: true, body: partial, method: 'https-partial' })
        } else {
          resolve({ ok: false, body: Buffer.alloc(0), method: 'https', error: e.message })
        }
      })
    })
    req.on('error', (e) => resolve({ ok: false, body: Buffer.alloc(0), method: 'https', error: e.message }))
    req.setTimeout(15_000, () => { req.destroy(new Error('timeout')) })
  })
}

function accessDenied(reason: string | undefined): NextResponse {
  if (reason === 'not-found') return NextResponse.json({ error: getTranslate('lib.files.notFound') }, { status: 404 })
  if (reason === 'not-configured') return NextResponse.json({ error: getTranslate('lib.files.storageNotConfigured'), code: 'NOT_CONFIGURED' }, { status: 503 })
  return NextResponse.json({ error: getTranslate('lib.files.loginRequired') }, { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Storage"' } })
}

async function downloadFile(webdavBase: string, relPath: string, auth: string): Promise<DownloadResult> {
  let result = await http2Get(webdavBase, relPath, auth)
  if (!result.ok) {
    console.warn(`[files] http2 失败 path="${relPath}" error="${result.error}, 回退 https"`)
    result = await httpsFallback(webdavBase, relPath, auth)
  }
  return result
}

function fileResponse(body: Buffer, stat: FileStat): NextResponse {
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': stat.mime ?? 'application/octet-stream',
      'Content-Length': String(body.length),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': stat.mime === 'text/html' ? 'attachment' : 'inline',
    },
  })
}

/**
 * B2 后端文件下载：使用 StorageProvider.getFileContents 下载
 */
async function b2Download(provider: StorageProvider, relativePath: string): Promise<Buffer> {
  const raw = await provider.getFileContents(relativePath)
  if (Buffer.isBuffer(raw)) return raw
  if (raw instanceof ArrayBuffer) return Buffer.from(new Uint8Array(raw))
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8')
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const d = raw.data
    if (Buffer.isBuffer(d)) return d
    if (d instanceof ArrayBuffer) return Buffer.from(new Uint8Array(d))
    return Buffer.from(String(d), 'utf8')
  }
  return Buffer.alloc(0)
}

/** B2 后端下载 + 响应封装 */
async function b2FileResponse(provider: StorageProvider, stat: FileStat, relativePath: string): Promise<NextResponse> {
  const body = await b2Download(provider, relativePath)
  return fileResponse(body, stat)
}

/** WebDAV 后端下载:优先本地缓存,回退远程下载 */
async function webdavFileResponse(stat: FileStat, relativePath: string): Promise<NextResponse> {
  const webdavUrl = process.env.WEBDAV_URL
  if (!webdavUrl) {
    console.error('[files] WEBDAV_URL 未配置')
    return NextResponse.json({ error: getTranslate('lib.files.webdavNotConfigured'), code: 'NOT_CONFIGURED' }, { status: 503 })
  }
  const webdavBase = webdavUrl.replace(/\/+$/, '')
  const auth = `Basic ${Buffer.from(`${process.env.WEBDAV_USER ?? ''}:${process.env.WEBDAV_PASS ?? ''}`).toString('base64')}`

  // WebDAV 远程下载(http2 → https)
  const result = await downloadFile(webdavBase, relativePath, auth)
  if (!result.ok) {
    console.error(`[files] 下载失败 path="${relativePath}" method=${result.method} error=${result.error}`)
    return NextResponse.json({ error: getTranslate('lib.files.downloadFailed') }, { status: 502 })
  }
  console.warn(`[files] 下载成功 path="${relativePath}" size=${result.body.length} method=${result.method}`)
  return fileResponse(result.body, stat)
}

/** 调试信息响应:仅限 sudo + 开发环境 */
function debugInfoResponse(
  req: NextRequest,
  session: Awaited<ReturnType<typeof getSession>> | null,
  relativePath: string,
  stat: FileStat,
  backend: string,
): NextResponse | null {
  if (new URL(req.url).searchParams.get('_debug') !== '1') return null
  if (!isRootRole(session?.role) || process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: getTranslate('lib.files.debugUnavailable') }, { status: 403 })
  }
  return NextResponse.json({
    relativePath,
    stat: { type: stat.type, size: stat.size, mime: stat.mime, lastmod: stat.lastmod },
    backend,
  })
}

/** 验证路径、检查权限、获取文件 stat，返回错误响应或 { provider, stat, session } */
async function validateAndStat(
  req: NextRequest,
  segments: string[],
): Promise<
  | { ok: false; response: NextResponse }
  | { ok: true; provider: StorageProvider; stat: FileStat; session: Awaited<ReturnType<typeof getSession>>; relativePath: string }
> {
  const relativePath = joinPath(...segments)
  if (!relativePath || !isValidPath(relativePath)) {
    return { ok: false, response: NextResponse.json({ error: getTranslate('lib.files.invalidPath') }, { status: 400 }) }
  }
  if (!isStorageConfigured()) {
    return { ok: false, response: NextResponse.json({ error: getTranslate('lib.files.storageNotConfigured'), code: 'NOT_CONFIGURED' }, { status: 503 }) }
  }
  const rateLimitResponse = checkDownloadRateLimit(req)
  if (rateLimitResponse) return { ok: false, response: rateLimitResponse }
  const session = await getSession()
  const access = await checkAccess(relativePath, !!session)
  if (!access.allowed) return { ok: false, response: accessDenied('reason' in access ? access.reason : undefined) }
  const provider = await getStorageProvider()
  const stat = unwrapStat(await provider.stat(relativePath))
  if (stat.type === 'directory') return { ok: false, response: NextResponse.json({ error: getTranslate('lib.files.notFound') }, { status: 404 }) }
  return { ok: true, provider, stat, session, relativePath }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  let relativePath = ''
  try {
    const { path: segments } = await params
    relativePath = joinPath(...segments)
    const validated = await validateAndStat(_req, segments)
    if (!validated.ok) return validated.response
    const { provider, stat, session, relativePath: relPath } = validated
    relativePath = relPath
    const debugResp = debugInfoResponse(_req, session, relativePath, stat, provider.backend)
    if (debugResp) return debugResp
    if (provider.backend === 'backblaze') {
      try {
        return await b2FileResponse(provider, stat, relativePath)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const status = (err as { status?: number })?.status
        // 404 语义透传，避免将“文件不存在”误判为 500
        if (status === 404 || /not found|no such key|不存在/i.test(msg)) {
          return NextResponse.json({ error: getTranslate('lib.files.notFound') }, { status: 404 })
        }
        throw err
      }
    }
    return await webdavFileResponse(stat, relativePath)
  } catch (err) {
    const e = err as { status?: number; message?: string }
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error(`[files] 未捕获异常 path="${relativePath || '?'}" error="${msg}"`)
    // 404 错误应返回 404 而非 500，避免前端误判为服务故障
    if (e?.status === 404 || /not found|no such key|不存在/i.test(msg)) {
      return NextResponse.json({ error: getTranslate('lib.files.notFound') }, { status: 404 })
    }
    return NextResponse.json({ error: getTranslate('lib.files.downloadFailed') }, { status: 500 })
  }
}
