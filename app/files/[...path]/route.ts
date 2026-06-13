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

export async function GET(_req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  let relativePath = ''
  try {
    const { path: segments } = await params
    relativePath = joinPath(...segments)
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
    // stat 校验文件存在
    const statRaw = await client.stat(relativePath)
    const stat = unwrapStat(statRaw)
    if (stat.type === 'directory') return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    console.warn(`[files] stat path="${relativePath}" type=${stat.type} size=${stat.size} 耗时=${Math.round(performance.now() - start)}ms`)

    if (new URL(_req.url).searchParams.get('_debug') === '1') {
      return debugResponse(relativePath, stat, Math.round(performance.now() - start))
    }

    // 用 webdav 客户端读取文件(处理路径和认证一致)
    const buf = await client.getFileContents(relativePath, { format: 'binary' }) as ArrayBuffer
    const headers: Record<string, string> = {
      'Content-Type': stat.mime ?? 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': stat.mime === 'text/html' ? 'attachment' : 'inline',
    }

    return new NextResponse(buf, { status: 200, headers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error(`[files] 未捕获异常 path="${relativePath || '?'}" error="${msg}"`)
    return NextResponse.json({ error: `内部错误: ${msg}` }, { status: 500 })
  }
}
