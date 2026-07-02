/**
 * 在 WebDAV 创建文件夹,并在 Prisma `storageFolder` 表写入/更新对应元数据(默认私有)
 * POST /api/storage/mkdir/[...path]
 * 已有元数据时保留原 public/description/createdAt,只刷新 updatedAt
 */
import { NextResponse } from 'next/server'
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth'
import { getDb } from '@/lib/db'
import {
  buildWebDavTarget,
  catchAllHandler,
  databaseNotConfigured,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  readFolderMeta,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.mkdir', requireAdmin: true },
  async (_req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    // API 密钥细粒度权限检查
    const authResult = await getSessionWithKeyId()
    if (authResult) {
      const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'storage_write')
      if (permErr) return permErr
    }

    const prisma = getDb().prisma
    if (!prisma) return databaseNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    // 先在存储后端上真实创建,失败直接返回
    try {
      const provider = await getStorageProvider()
      await provider.createDirectory(target, { recursive: true })
    } catch (err) {
      console.error(`[storage.mkdir] target="${target}" 存储后端创建失败`, err)
      return storageErrorResponse(err, '创建目录')
    }

    // 再 upsert Prisma 元数据(保留已有公开/描述,仅刷新 updatedAt)
    const existing = await readFolderMeta(rel)
    const now = new Date()
    const upserted = await prisma.storageFolder.upsert({
      where: { path: rel },
      create: {
        path: rel,
        public: false,
        description: null,
      },
      update: {
        // 保留 public / description;仅刷新 updatedAt
        updatedAt: now,
      },
    })

    const meta = existing
      ? { ...existing, updatedAt: upserted.updatedAt }
      : {
          path: upserted.path,
          public: upserted.public,
          description: upserted.description,
          createdAt: upserted.createdAt,
          updatedAt: upserted.updatedAt,
        }

    console.warn(`[storage.mkdir] target="${target}" 元数据已写入`)
    return NextResponse.json(meta)
  }
)
