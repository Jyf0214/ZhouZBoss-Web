/**
 * 存储池 / WebDAV 公开读取代理
 *
 * GET /files/[...path]
 *
 * 职责:校验 ACL → 代理上游 WebDAV 文件流
 * - 不写管理 API(留给其他 Agent)
 * - 不写管理 UI(留给其他 Agent)
 * - 目录访问拒绝(由 /admin/storage 提供浏览能力)
 */
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { checkAccess } from '@/lib/storage/acl'
import { isValidPath, joinPath } from '@/lib/storage/path'
import type { FileStat, ResponseDataDetailed } from 'webdav'

/** 路由动态段:catch-all,Next.js 16 异步 params */
interface RouteParams {
  path: string[]
}

/** webdav.stat 可能返回 FileStat 或带 details 的包装 */
function unwrapStat(
  raw: FileStat | ResponseDataDetailed<FileStat>
): FileStat {
  if (
    typeof (raw as ResponseDataDetailed<FileStat>).data === 'object' &&
    (raw as ResponseDataDetailed<FileStat>).data !== null &&
    'filename' in (raw as ResponseDataDetailed<FileStat>).data
  ) {
    return (raw as ResponseDataDetailed<FileStat>).data
  }
  return raw as FileStat
}

/** 诊断模式:返回 WebDAV 连接信息而非文件流 */
function debugResponse(
  relativePath: string,
  stat: FileStat,
  statMs: number,
): NextResponse {
  return NextResponse.json({
    relativePath,
    stat: { type: stat.type, size: stat.size, mime: stat.mime, lastmod: stat.lastmod },
    statMs,
    webdavUrl: process.env.WEBDAV_URL?.substring(0, 40) + '...',
    webdavUser: process.env.WEBDAV_USER?.substring(0, 10) + '...',
  })
}

/** ACL 拒绝时的统一响应 */
function accessDenied(reason: string | undefined): NextResponse {
  if (reason === 'not-found') {
    return NextResponse.json({ error: '资源不存在' }, { status: 404 })
  }
  if (reason === 'not-configured') {
    return NextResponse.json({ error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' }, { status: 503 })
  }
  return NextResponse.json(
    { error: '请先登录' },
    { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Storage"' } }
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const { path: segments } = await params
  const relativePath = joinPath(...segments)
  const start = performance.now()

  console.warn(`[files] 请求路径="${relativePath}" segments=${JSON.stringify(segments)}`)

  if (!relativePath || !isValidPath(relativePath)) {
    return NextResponse.json({ error: '路径非法' }, { status: 400 })
  }

  if (!isWebDavConfigured()) {
    return NextResponse.json({ error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' }, { status: 503 })
  }

  const session = await getSession()
  const access = await checkAccess(relativePath, !!session)
  console.warn(`[files] ACL path="${relativePath}" uid=${session?.uid ?? 'null'} allowed=${access.allowed} reason=${'reason' in access ? access.reason : 'none'}`)
  if (!access.allowed) return accessDenied('reason' in access ? access.reason : undefined)

  const client = getWebDavClient()
  return proxyWebDav(client, relativePath, _req, start)
}

/** WebDAV 代理:stat → stream */
async function proxyWebDav(
  client: ReturnType<typeof getWebDavClient>,
  relativePath: string,
  _req: NextRequest,
  start: number,
): Promise<NextResponse> {
  try {
    console.warn(`[files] 开始 stat path="${relativePath}"`)
    const statStart = performance.now()
    const statRaw = await client.stat(relativePath)
    const stat = unwrapStat(statRaw)
    const statMs = Math.round(performance.now() - statStart)
    console.warn(`[files] stat 完成 type=${stat.type} size=${stat.size} mime=${stat.mime} 耗时=${statMs}ms`)
    if (stat.type === 'directory') {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    }

    if (new URL(_req.url).searchParams.get('_debug') === '1') {
      return debugResponse(relativePath, stat, statMs)
    }

    console.warn(`[files] 开始读取文件 path="${relativePath}" size=${stat.size}`)
    const buf = await client.getFileContents(relativePath, { format: 'binary' }) as ArrayBuffer
    const body = new Uint8Array(buf)

    console.warn(`[files] 响应已返回 path="${relativePath}" size=${body.length} 耗时=${Math.round(performance.now() - start)}ms`)
    return new NextResponse(body, {
      headers: {
        'Content-Type': stat.mime ?? 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Last-Modified': stat.lastmod ?? new Date().toUTCString(),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline';",
        'Content-Disposition': stat.mime === 'text/html' ? 'attachment' : 'inline',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[files] webdav 错误 path="${relativePath}" 耗时=${Math.round(performance.now() - start)}ms error="${msg}"`)
    return NextResponse.json({ error: `文件读取失败: ${msg}` }, { status: 404 })
  }
}
