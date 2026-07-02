/**
 * 重命名存储池中的文件夹
 * POST /api/storage/rename/[...path]
 *
 * 请求体: { newName: string }
 * 重命名存储后端文件/文件夹 + 更新数据库元数据
 */
import { NextResponse } from 'next/server'
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth'
import {
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  readFolderMeta,
  renameFolderMeta,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
} from '../../_helpers'

/** 检查目标路径是否已存在（数据库 + 存储层双重检查） */
async function assertTargetAvailable(newRel: string, segments: string[], newName: string): Promise<NextResponse | null> {
  try {
    const existingMeta = await readFolderMeta(newRel)
    if (existingMeta) {
      return NextResponse.json({ error: '目标名称已存在' }, { status: 409 })
    }
  } catch {
    // 忽略 DB 检查失败，继续检查存储层
  }
  try {
    const provider = await getStorageProvider()
    const newTarget = buildWebDavTarget([...segments, newName])
    await provider.stat(newTarget)
    return NextResponse.json({ error: '目标名称已存在' }, { status: 409 })
  } catch {
    // stat 失败说明目标不存在，可以继续
  }
  return null
}

/** 校验重命名名称合法性:空值、特殊字符、目录穿越 */
function validateNewName(newName: string): NextResponse | null {
  if (!newName) {
    return NextResponse.json({ error: '新名称不能为空' }, { status: 400 })
  }
  if (newName.includes('/') || newName.includes('\\') || newName === '.' || newName === '..') {
    return NextResponse.json({ error: '名称非法' }, { status: 400 })
  }
  return null
}

/** 解析重命名请求：校验名称、计算新路径 */
function parseRenameInput(
  reqBody: Record<string, unknown>,
  rel: string,
): { newName: string; newRel: string; segments: string[] } | NextResponse {
  const newName = String(reqBody.newName ?? '').trim()
  const nameError = validateNewName(newName)
  if (nameError) return nameError

  // 提取父路径和旧文件夹名
  const segments = rel.split('/')
  const oldName = segments.pop()!
  const parentPath = segments.join('/')

  if (newName === oldName) {
    return NextResponse.json({ error: '新名称与当前名称相同' }, { status: 400 })
  }

  const newRel = parentPath ? `${parentPath}/${newName}` : newName
  if (!isValidStoragePath(newRel)) return invalidPathResponse()

  return { newName, newRel, segments }
}

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.rename', requireAdmin: true },
  async (req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    // API 密钥细粒度权限检查
    const authResult = await getSessionWithKeyId()
    if (authResult) {
      const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'storage_write')
      if (permErr) return permErr
    }

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()

    // 解析请求体
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
    }

    const parseResult = parseRenameInput(body, rel)
    if (parseResult instanceof NextResponse) return parseResult
    const { newName, newRel, segments } = parseResult

    // 检查目标是否已存在（数据库 + 存储层双重检查）
    const conflict = await assertTargetAvailable(newRel, segments, newName)
    if (conflict) return conflict

    const oldTarget = buildWebDavTarget(parts)
    // 构建新目标路径:替换最后一段
    const newParts = [...segments, newName]
    const newTarget = buildWebDavTarget(newParts)

    try {
      const provider = await getStorageProvider()
      await provider.moveFile(oldTarget, newTarget)
    } catch (err) {
      console.error(`[storage.rename] target="${oldTarget}" → "${newTarget}" 失败`, err)
      return storageErrorResponse(err, '重命名')
    }

    // 更新数据库元数据
    try {
      await renameFolderMeta(rel, newRel)
    } catch (metaErr) {
      console.error(`[storage.rename] 元数据更新失败 "${rel}" → "${newRel}"`, metaErr)
    }

    console.warn(`[storage.rename] "${rel}" → "${newRel}" 重命名成功`)

    // 返回更新后的元数据
    const meta = await readFolderMeta(newRel)
    return NextResponse.json(meta ?? {
      path: newRel,
      public: false,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
)
