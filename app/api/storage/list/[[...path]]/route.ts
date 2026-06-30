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
  getStorageProvider,
  isStorageConfigured,
  toWebDavEntry,
  storageNotConfigured,
  storageErrorResponse,
} from '../../_helpers'
import { isValidPath } from '@/lib/storage/path'

export const GET = catchAllHandler<{ path?: string[] }>(
  'GET',
  { label: 'storage.list', requireAdmin: true },
  async (_req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const parts = await getPathParts(context)
    const target = buildWebDavTarget(parts)
    // 路径穿越防护：拒绝含 .. 的路径段
    if (target && !isValidPath(target)) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
    }
    try {
      const provider = await getStorageProvider()
      const stats = await provider.listDirectory(target)
      const entries = stats.map(toWebDavEntry)
      console.warn(`[storage.list] target="${target}" entries=${entries.length}`)
      return NextResponse.json(
        { path: target, entries },
        { headers: { 'Cache-Control': 'private, max-age=10' } },
      )
    } catch (err) {
      console.error(`[storage.list] target="${target}" 失败`, err)
      return storageErrorResponse(err, '列出目录')
    }
  }
)
