/**
 * 删除存储池中的文件
 * DELETE /api/storage/file/[...path]
 * 路径必须指向一个具体文件,不能是根
 */
import { NextResponse } from 'next/server'
import {
  buildWebDavTarget,
  catchAllHandler,
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
  { label: 'storage.file.delete', requireAdmin: true },
  async (_req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    try {
      const client = getWebDavClient()
      await client.deleteFile(target)
    } catch (err) {
      console.error(`[storage.file.delete] target="${target}" 失败`, err)
      return webdavErrorResponse(err, '删除文件')
    }

    console.warn(`[storage.file.delete] target="${target}" 已删除`)
    return new NextResponse(null, { status: 204 })
  }
)
