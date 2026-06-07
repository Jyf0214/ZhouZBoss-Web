/**
 * 列出文件夹内容(直接走 WebDAV PROPFIND,不入库)
 * GET /api/storage/list/[...path]
 * path 为空数组时表示根目录
 */
import { NextResponse } from 'next/server'
import {
  catchAllHandler,
  getPathParts,
  buildWebDavTarget,
  getWebDavClient,
  isWebDavConfigured,
  toWebDavEntry,
  webdavNotConfigured,
  webdavErrorResponse,
} from '../../_helpers'

export const GET = catchAllHandler<{ path: string[] }>(
  'GET',
  { label: 'storage.list', requireAdmin: true },
  async (_req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const parts = await getPathParts(context)
    const target = buildWebDavTarget(parts)
    try {
      const client = getWebDavClient()
      const stats = await client.getDirectoryContents(target)
      const entries = stats.map(toWebDavEntry)
      return NextResponse.json(
        { path: target, entries },
        { headers: { 'Cache-Control': 'private, max-age=10' } },
      )
    } catch (err) {
      return webdavErrorResponse(err, '列出目录')
    }
  }
)
