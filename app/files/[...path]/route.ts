/**
 * 存储池 / WebDAV 公开读取代理
 *
 * GET /files/[...path]
 *
 * 职责:校验 ACL → 代理上游 WebDAV 文件流
 * 参考: OpenList 的 proxy 模式——用 fetch() 直接流式代理,不缓冲
 */
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { checkAccess } from '@/lib/storage/acl'
import { isValidPath, joinPath } from '@/lib/storage/path'
import type { FileStat, ResponseDataDetailed } from 'webdav'

interface RouteParams { path: string[] }

function unwrapStat(raw: FileStat | ResponseDataDetailed<FileStat>): FileStat {
  if (
    typeof (raw as ResponseDataDetailed<FileStat>).data === 'object' &&
    (raw as ResponseDataDetailed<FileStat>).data !== null &&
    'filename' in (raw as ResponseDataDetailed<FileStat>).data
  ) return (raw as ResponseDataDetailed<FileStat>).data
  return raw as FileStat
}

function debugResponse(relativePath: string, stat: FileStat, statMs: number): NextResponse {
  return NextResponse.json({
    relativePath,
    stat: { type: stat.type, size: stat.size, mime: stat.mime, lastmod: stat.lastmod },
    statMs,
    webdavUrl: (process.env.WEBDAV_URL ?? '').substring(0, 40) + '...',
  })
}

function accessDenied(reason: string | undefined): NextResponse {
  if (reason === 'not-found') return NextResponse.json({ error: '资源不存在' }, { status: 404 })
  if (reason === 'not-configured') return NextResponse.json({ error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' }, { status: 503 })
  return NextResponse.json({ error: '请先登录' }, { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Storage"' } })
}

/** 白名单:只允许透传的安全响应头 */
const ALLOWED_RESPONSE_HEADERS = new Set([
  'content-type', 'content-length', 'content-disposition',
  'content-range', 'accept-ranges', 'etag', 'last-modified',
  'cache-control', 'expires', 'content-encoding',
])

export async function GET(_req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { path: segments } = await params
  const relativePath = joinPath(...segments)
  const start = performance.now()

  if (!relativePath || !isValidPath(relativePath)) {
    return NextResponse.json({ error: '路径非法' }, { status: 400 })
  }
  if (!isWebDavConfigured()) {
    return NextResponse.json({ error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' }, { status: 503 })
  }

  const session = await getSession()
  const access = await checkAccess(relativePath, !!session)
  if (!access.allowed) return accessDenied('reason' in access ? access.reason : undefined)

  const client = getWebDavClient()
  try {
    // stat 校验文件存在
    const statRaw = await client.stat(relativePath)
    const stat = unwrapStat(statRaw)
    if (stat.type === 'directory') return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    console.warn(`[files] stat path="${relativePath}" type=${stat.type} size=${stat.size} 耗时=${Math.round(performance.now() - start)}ms`)

    if (new URL(_req.url).searchParams.get('_debug') === '1') {
      return debugResponse(relativePath, stat, Math.round(performance.now() - start))
    }

    // fetch 流式代理:直接请求 WebDAV 服务器,零缓冲流式返回
    const webdavUrl = `${process.env.WEBDAV_URL!.replace(/\/+$/, '')}/${relativePath}`
    const auth = Buffer.from(`${process.env.WEBDAV_USER}:${process.env.WEBDAV_PASS}`).toString('base64')
    console.warn(`[files] fetch 代理 path="${relativePath}" url="${webdavUrl.substring(0, 60)}..."`)

    const upstream = await fetch(webdavUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    })

    if (!upstream.ok) {
      console.error(`[files] fetch 失败 path="${relativePath}" status=${upstream.status}`)
      return NextResponse.json({ error: '文件读取失败' }, { status: upstream.status })
    }

    // 过滤白名单响应头
    const headers = new Headers()
    upstream.headers.forEach((val, key) => {
      if (ALLOWED_RESPONSE_HEADERS.has(key.toLowerCase())) headers.set(key, val)
    })
    headers.set('Cache-Control', 'private, max-age=3600')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Content-Disposition', stat.mime === 'text/html' ? 'attachment' : 'inline')

    console.warn(`[files] 返回流 path="${relativePath}" 耗时=${Math.round(performance.now() - start)}ms`)
    return new NextResponse(upstream.body, { status: upstream.status, headers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[files] 错误 path="${relativePath}" 耗时=${Math.round(performance.now() - start)}ms error="${msg}"`)
    return NextResponse.json({ error: `文件读取失败: ${msg}` }, { status: 404 })
  }
}
