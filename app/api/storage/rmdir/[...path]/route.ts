/**
 * 删除存储池中的文件夹
 * DELETE /api/storage/rmdir/[...path]
 *
 * - WebDAV 物理删除 + Prisma 元数据清理
 * - 记录审计日志
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logStorageAction } from '@/lib/storage/audit'
import {
  buildWebDavTarget,
  catchAllHandler,
  deleteFolderMeta,
  getPathParts,
  getWebDavClient,
  invalidPathResponse,
  isValidStoragePath,
  isWebDavConfigured,
  resolveStoragePath,
  rootNotAllowedResponse,
  webdavErrorResponse,
  webdavNotConfigured,
} from '../../_helpers'

export const DELETE = catchAllHandler<{ path: string[] }>(
  'DELETE',
  { label: 'storage.rmdir', requireAdmin: true },
  async (req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    const session = await getSession()
    const actorUid = session?.uid ?? null

    await logStorageAction({
      actorUid,
      action: 'rmdir',
      path: rel,
      metadata: { recursive: false },
    })

    try {
      const client = getWebDavClient()
      await client.deleteFile(target)
    } catch (err) {
      return webdavErrorResponse(err, '删除目录')
    }

    await deleteFolderMeta(rel)

    return new NextResponse(null, { status: 204 })
  }
)
