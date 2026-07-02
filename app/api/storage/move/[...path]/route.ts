/**
 * 移动存储池中的文件/文件夹
 * POST /api/storage/move/[...path]
 *
 * 请求体: { destination: string }
 * 移动存储后端文件 + 更新数据库元数据
 */
import { NextResponse } from 'next/server'
import {
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  renameFolderMeta,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.move', requireAdmin: true },
  async (req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const parts = await getPathParts(context)
    const srcRel = resolveStoragePath(parts)
    if (srcRel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(srcRel)) return invalidPathResponse()

    // 解析请求体
    let destination: string
    try {
      const body = await req.json() as Record<string, unknown>
      destination = String(body.destination ?? '').trim()
    } catch {
      return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
    }

    if (!destination) {
      return NextResponse.json({ error: '目标路径不能为空' }, { status: 400 })
    }

    // 提取源名称
    const srcSegments = srcRel.split('/')
    const srcName = srcSegments[srcSegments.length - 1]!

    // 构建目标相对路径: destination/srcName
    const destRel = destination ? `${destination}/${srcName}` : srcName

    if (!isValidStoragePath(destRel)) return invalidPathResponse()

    if (srcRel === destRel) {
      return NextResponse.json({ error: '源路径和目标路径相同' }, { status: 400 })
    }

    // 防止移动到自身子目录导致数据丢失
    if (destRel.startsWith(srcRel + '/')) {
      return NextResponse.json({ error: '不能移动到自身的子目录中' }, { status: 400 })
    }

    const oldTarget = buildWebDavTarget(parts)
    const destSegments = destRel.split('/')
    const newTarget = buildWebDavTarget(destSegments)

    // 检查目标是否已存在，防止静默覆盖
    try {
      const provider = await getStorageProvider()
      await provider.stat(newTarget)
      return NextResponse.json({ error: '目标位置已存在同名文件或文件夹' }, { status: 409 })
    } catch {
      // stat 失败说明目标不存在，可以安全移动
    }

    try {
      const provider = await getStorageProvider()
      await provider.moveFile(oldTarget, newTarget)
    } catch (err) {
      console.error(`[storage.move] target="${oldTarget}" → "${newTarget}" 失败`, err)
      return storageErrorResponse(err, '移动')
    }

    // 更新数据库元数据(重命名主键 + 级联子路径)
    try {
      await renameFolderMeta(srcRel, destRel)
    } catch (metaErr) {
      console.error(`[storage.move] 元数据更新失败 "${srcRel}" → "${destRel}"`, metaErr)
      // 存储已移动但元数据更新失败：返回警告而非崩溃
    }

    console.warn(`[storage.move] "${srcRel}" → "${destRel}" 移动成功`)

    return NextResponse.json({ path: destRel })
  }
)
