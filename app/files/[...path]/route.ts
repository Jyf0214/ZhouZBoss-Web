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
import { Readable } from 'node:stream'
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
  // 仅当 details 选项打开时,stat 会返回 ResponseDataDetailed
  // 由于本调用未传 details,正常情况下 raw 即 FileStat;
  // 此处用 'filename' 字段判别(FileStat 必有,包装对象没有)
  if (
    typeof (raw as ResponseDataDetailed<FileStat>).data === 'object' &&
    (raw as ResponseDataDetailed<FileStat>).data !== null &&
    'filename' in (raw as ResponseDataDetailed<FileStat>).data
  ) {
    return (raw as ResponseDataDetailed<FileStat>).data
  }
  return raw as FileStat
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const { path: segments } = await params
  const relativePath = joinPath(...segments)

  // 1. 路径合法性
  if (!relativePath || !isValidPath(relativePath)) {
    return NextResponse.json({ error: '路径非法' }, { status: 400 })
  }

  // 2. WebDAV 是否配置
  if (!isWebDavConfigured()) {
    return NextResponse.json(
      { error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' },
      { status: 503 }
    )
  }

  // 3. ACL 校验
  const session = await getSession()
  const access = await checkAccess(relativePath, !!session)
  if (!access.allowed) {
    if (access.reason === 'not-found') {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    }
    if (access.reason === 'not-configured') {
      return NextResponse.json(
        { error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' },
        { status: 503 }
      )
    }
    // private:统一 401 + Basic realm,鼓励登录
    return NextResponse.json(
      { error: '请先登录' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Storage"' },
      }
    )
  }

  // 4. 代理 WebDAV
  const client = getWebDavClient()
  try {
    const statRaw = await client.stat(relativePath)
    const stat = unwrapStat(statRaw)
    if (stat.type === 'directory') {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    }

    const nodeStream = client.createReadStream(relativePath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': stat.mime ?? 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Last-Modified': stat.lastmod ?? new Date().toUTCString(),
        // 私有缓存:防止用户上传的恶意文件经共享 CDN/代理缓存投递给其他用户
        'Cache-Control': 'private, max-age=3600',
        // 禁止 MIME 嗅探:防止浏览器将 text/plain 误判为 text/html 并执行内联脚本
        'X-Content-Type-Options': 'nosniff',
        // 严格 CSP:用户控制的文件不应获得脚本执行能力,资源加载限制到 self/data
        'Content-Security-Policy':
          "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline';",
        // HTML 强制下载而非渲染:避免用户上传的 HTML 文件成为 XSS 攻击载体
        'Content-Disposition': stat.mime === 'text/html' ? 'attachment' : 'inline',
      },
    })
  } catch (err) {
    // 上游 WebDAV 错误(文件不存在、网络故障、权限不足等)
    console.error('[files] webdav proxy error:', err)
    return NextResponse.json(
      { error: '资源不存在' },
      { status: 404 }
    )
  }
}
