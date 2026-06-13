/**
 * 单个文件夹元数据
 * GET    /api/storage/folder/[...path]  → 读取一条记录
 * PATCH  /api/storage/folder/[...path]  → 部分更新 public / description
 */
import { NextResponse } from 'next/server'
import { ApiErr } from '@/lib/api-handler'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/hash'
import {
  catchAllHandler,
  databaseNotConfigured,
  getPathParts,
  invalidPathResponse,
  isValidStoragePath,
  readFolderMeta,
  resolveStoragePath,
  webdavNotConfigured,
} from '../../_helpers'
import { isWebDavConfigured } from '@/lib/webdav'

/** 读取单条文件夹元数据 */
export const GET = catchAllHandler<{ path: string[] }>(
  'GET',
  { label: 'storage.folder.get', requireAdmin: true },
  async (_req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()
    if (!getDb().prisma) return databaseNotConfigured()

    const parts = await getPathParts(context)
    const path = resolveStoragePath(parts)
    if (!isValidStoragePath(path)) return invalidPathResponse()

    const meta = await readFolderMeta(path)
    if (!meta) return ApiErr.notFound('文件夹元数据不存在')
    return NextResponse.json(meta)
  }
)

/** 校验 PATCH 请求体字段类型 */
function validatePatchFields(parsed: Record<string, unknown>): { error?: NextResponse } {
  const rawPublic = parsed['public']
  const rawDescription = parsed['description']
  const rawPassword = parsed['password']

  if (rawPublic !== undefined && typeof rawPublic !== 'boolean') {
    return { error: ApiErr.badRequest('public 必须是 boolean') }
  }
  if (
    rawDescription !== undefined &&
    rawDescription !== null &&
    typeof rawDescription !== 'string'
  ) {
    return { error: ApiErr.badRequest('description 必须是 string 或 null') }
  }
  if (
    rawPassword !== undefined &&
    rawPassword !== null &&
    typeof rawPassword !== 'string'
  ) {
    return { error: ApiErr.badRequest('password 必须是 string 或 null') }
  }
  if (typeof rawPassword === 'string' && rawPassword.length > 128) {
    return { error: ApiErr.badRequest('password 不能超过 128 字符') }
  }
  return {}
}

/** 根据请求体和已有元数据计算合并后的字段值 */
async function mergePatchFields(
  parsed: Record<string, unknown>,
  existing: { public: boolean; description: string | null },
): Promise<{ nextPublic: boolean; nextDescription: string | null; nextPassword: string | null; passwordChanged: boolean }> {
  const rawPassword = parsed['password']
  const nextPublic = (parsed['public'] as boolean | undefined) ?? existing.public
  const nextDescription = (parsed['description'] as string | null | undefined) ?? existing.description

  let nextPassword: string | null = null
  let passwordChanged = false
  if (rawPassword !== undefined) {
    passwordChanged = true
    if (rawPassword === null || rawPassword === '') {
      nextPassword = null
    } else {
      nextPassword = await hashPassword(rawPassword as string)
    }
  }

  return { nextPublic, nextDescription, nextPassword, passwordChanged }
}

/** 部分更新文件夹元数据(public / description) */
export const PATCH = catchAllHandler<{ path: string[] }>(
  'PATCH',
  { label: 'storage.folder.patch', requireAdmin: true },
  async (req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()
    const prisma = getDb().prisma
    if (!prisma) return databaseNotConfigured()

    const parts = await getPathParts(context)
    const path = resolveStoragePath(parts)
    if (!isValidStoragePath(path)) return invalidPathResponse()

    const existing = await readFolderMeta(path)
    if (!existing) return ApiErr.notFound('文件夹元数据不存在')

    let parsed: Record<string, unknown>
    try {
      parsed = (await req.json()) as Record<string, unknown>
    } catch {
      return ApiErr.badRequest('请求体不是合法 JSON')
    }

    const validation = validatePatchFields(parsed)
    if (validation.error) return validation.error

    const { nextPublic, nextDescription, nextPassword, passwordChanged } =
      await mergePatchFields(parsed, existing)

    const updatedAt = new Date()
    const updated = await prisma.storageFolder.update({
      where: { path },
      data: {
        public: nextPublic,
        description: nextDescription,
        ...(passwordChanged ? { password: nextPassword } : {}),
        updatedAt,
      },
    })

    console.warn(`[storage.folder.patch] path="${path}" public=${nextPublic} password=${passwordChanged ? '已更新' : '未变'}`)
    return NextResponse.json({
      path: updated.path,
      public: updated.public,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  }
)
