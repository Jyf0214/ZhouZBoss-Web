/**
 * 存储池管理 API 共享工具
 *
 * 仅供 app/api/storage/** 下的路由使用,集中处理:
 * - 文件夹元数据(Prisma `storageFolder` 表,StorageFolder model)的增删查
 * - 存储后端未配置 / 路径非法 / 资源不存在 / 上游错误的统一响应
 * - [...path] 路由参数到存储目标路径的解析
 * - WebDavEntry 类型转换
 *
 * 与 lib/storage/acl.ts 保持同构:acl.ts 读 Prisma(用于公开访问的 ACL 判定),
 * 本文件在管理员操作时同时读写 Prisma。
 *
 * 支持 WebDAV / Backblaze B2 双后端(通过 StorageProvider 接口)。
 */
import { NextResponse } from 'next/server'
import type { FileStat } from 'webdav'
import { getDb } from '@/lib/db'
import { isStorageConfigured, getStorageProvider } from '@/lib/storage/storage-provider'
import { isValidPath, joinPath } from '@/lib/storage/path'
import { apiHandler } from '@/lib/api-handler'
import type { StorageFolderMeta, WebDavEntry } from '@/lib/storage/types'

/** 直接复用 lib/api-handler 导出的 ApiHandlerOptions(已支持泛型 + requireSudo) */
export { apiHandler, type ApiHandlerOptions } from '@/lib/api-handler'

/** 存储根路径:暂未支持多挂载,所有路径相对根(空串) */
const STORAGE_ROOT = ''

/** 上传文件大小上限:50MB */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024

/**
 * 解析 [...path] 路由参数为相对路径字符串
 * - 空数组 / undefined → ''
 * - 单段 → 'covers'
 * - 多段 → 'covers/2024/img.png'
 */
export function resolveStoragePath(parts: string[] | undefined): string {
  if (!parts || parts.length === 0) return ''
  return joinPath(...parts)
}

/** 校验 [...path] 解析后的路径是否合法(空路径视为合法,代表根) */
export function isValidStoragePath(path: string): boolean {
  if (path === '') return true
  return isValidPath(path)
}

/** 把 [...path] 与 STORAGE_ROOT 拼接,得到存储目标路径 */
export function buildWebDavTarget(parts: string[] | undefined): string {
  return joinPath(STORAGE_ROOT, resolveStoragePath(parts))
}

/** 存储后端未配置时返回的 503 响应(供前端识别) */
export function storageNotConfigured(): NextResponse {
  return NextResponse.json(
    { error: '存储后端未配置', code: 'NOT_CONFIGURED' },
    { status: 503 }
  )
}

/** 数据库未配置时返回的 503 响应(供前端识别) */
export function databaseNotConfigured(): NextResponse {
  return NextResponse.json(
    { error: '数据库未配置', code: 'DB_NOT_CONFIGURED' },
    { status: 503 }
  )
}

/** 路径非法时返回的 400 响应 */
export function invalidPathResponse(): NextResponse {
  return NextResponse.json({ error: '路径非法' }, { status: 400 })
}

/** 不能对根目录执行该操作时返回的 400 响应 */
export function rootNotAllowedResponse(): NextResponse {
  return NextResponse.json({ error: '不能操作根目录' }, { status: 400 })
}

/** 上传文件过大时返回的 413 响应 */
export function payloadTooLargeResponse(size: number): NextResponse {
  return NextResponse.json(
    { error: `文件过大(${size} bytes,上限 ${MAX_UPLOAD_SIZE} bytes)` },
    { status: 413 }
  )
}

/** 从 [...path] 路由参数安全获取 string[] 类型(避免 apiHandler 上下文类型过宽) */
export async function getPathParts(
  context: { params: Promise<Record<string, unknown>> } | undefined
): Promise<string[]> {
  const params = (await context?.params) ?? {}
  const raw = params['path']
  return Array.isArray(raw) ? (raw as string[]) : []
}

/** 读取单个文件夹元数据;数据库未配置或记录不存在 → null */
export async function readFolderMeta(path: string): Promise<StorageFolderMeta | null> {
  const prisma = getDb().prisma
  if (!prisma) return null
  try {
    const row = await prisma.storageFolder.findUnique({ where: { path } })
    if (!row) return null
    return {
      path: row.path,
      public: row.public,
      description: row.description,
      hasPassword: !!row.password,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  } catch {
    return null
  }
}

/**
 * 写入/更新文件夹元数据(upsert 语义)
 *
 * - 数据库未配置 → 静默跳过(调用方需在调用前做 503 判断)
 * - 已有记录 → 仅刷新 `updatedAt`,其他字段保留(便于 mkdir 时保留已配置公开状态)
 * - 不存在 → 创建默认私有记录(public=false, description=null)
 */
export async function writeFolderMeta(meta: StorageFolderMeta): Promise<void> {
  const prisma = getDb().prisma
  if (!prisma) return
  await prisma.storageFolder.upsert({
    where: { path: meta.path },
    create: {
      path: meta.path,
      public: meta.public,
      description: meta.description,
    },
    update: {
      public: meta.public,
      description: meta.description,
      updatedAt: meta.updatedAt,
    },
  })
}

/**
 * 删除文件夹元数据(记录不存在不抛错)
 *
 * - 数据库未配置 → 静默跳过
 * - Prisma P2025 (RecordNotFound) → 忽略(幂等)
 * - 其他异常 → 静默忽略(失败安全;WebDAV 删除可能已成功)
 */
export async function deleteFolderMeta(path: string): Promise<void> {
  const prisma = getDb().prisma
  if (!prisma) return
  try {
    await prisma.storageFolder.delete({ where: { path } })
  } catch (err) {
    // Prisma 错误码 P2025 表示记录不存在
    const code = (err as { code?: string })?.code
    if (code === 'P2025') return
    // 其他错误不再上抛,避免 WebDAV 已删除成功却被元数据删除失败阻断
    // 上层若有更高一致性需求,可在路由层另行处理
  }
}

/**
 * 删除文件夹元数据(级联删除子文件夹)
 *
 * - 数据库未配置 → 静默跳过
 * - 删除 path 本身 + 所有以 path/ 开头的子记录
 */
export async function deleteFolderMetaCascade(path: string): Promise<void> {
  const prisma = getDb().prisma
  if (!prisma) return
  try {
    await prisma.$transaction(async (tx) => {
      // 查找自身
      const existing = await tx.storageFolder.findUnique({ where: { path } })
      if (existing) {
        await tx.storageFolder.delete({ where: { path } })
      }
      // 级联删除所有子路径
      const children = await tx.storageFolder.findMany({
        where: { path: { startsWith: `${path}/` } },
      })
      if (children.length > 0) {
        await tx.storageFolder.deleteMany({
          where: { path: { startsWith: `${path}/` } },
        })
      }
    })
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === 'P2025') return
    console.error(`[storage] deleteFolderMetaCascade 失败: ${path}`, err)
  }
}

/**
 * 重命名文件夹元数据(主键变更 + 级联更新子文件夹路径)
 *
 * - 数据库未配置 → 静默跳过
 * - 事务内完成:删除旧记录 → 创建新记录 → 更新子路径
 * - 子路径更新:所有 path 以 oldPath/ 开头的记录前缀替换为 newPath/
 */
export async function renameFolderMeta(oldPath: string, newPath: string): Promise<void> {
  const prisma = getDb().prisma
  if (!prisma) return
  try {
    await prisma.$transaction(async (tx) => {
      // 查找旧记录
      const old = await tx.storageFolder.findUnique({ where: { path: oldPath } })
      if (!old) return

      // 删除旧记录(主键不可变,需删除再创建)
      await tx.storageFolder.delete({ where: { path: oldPath } })

      // 创建新记录(保留所有元数据)
      await tx.storageFolder.create({
        data: {
          path: newPath,
          public: old.public,
          description: old.description,
          password: old.password,
        },
      })

      // 级联更新子文件夹路径前缀
      // 查找所有 path 以 oldPath/ 开头的记录
      const children = await tx.storageFolder.findMany({
        where: { path: { startsWith: `${oldPath}/` } },
      })
      for (const child of children) {
        const childNewPath = newPath + child.path.slice(oldPath.length)
        await tx.storageFolder.update({
          where: { path: child.path },
          data: { path: childNewPath },
        })
      }
    })
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === 'P2025') return
    console.error(`[storage] renameFolderMeta 失败: ${oldPath} → ${newPath}`, err)
  }
}

/** 列出所有文件夹元数据,按路径升序;数据库未配置 → 空数组 */
export async function listAllFolderMetas(): Promise<StorageFolderMeta[]> {
  const prisma = getDb().prisma
  if (!prisma) return []
  try {
    const rows = await prisma.storageFolder.findMany({
      orderBy: { path: 'asc' },
    })
    return rows.map((row) => ({
      path: row.path,
      public: row.public,
      description: row.description,
      hasPassword: !!row.password,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  } catch {
    return []
  }
}

/** 转换 webdav FileStat → WebDavEntry(mime 缺失时为 null) */
export function toWebDavEntry(stat: FileStat): WebDavEntry {
  return {
    filename: stat.filename,
    basename: stat.basename,
    isDirectory: stat.type === 'directory',
    size: stat.size,
    lastModified: stat.lastmod,
    mimeType: stat.mime ?? null,
  }
}

/**
 * 把任意错误转换为 NextResponse
 * - 存储 404 → 404
 * - 存储 5xx → 502(上游故障)
 * - 其他 → 500(本地错误)
 */
export function storageErrorResponse(err: unknown, op: string): NextResponse {
  const e = err as { status?: number; message?: string }
  if (e?.status === 404) {
    return NextResponse.json({ error: '资源不存在' }, { status: 404 })
  }
  if (e?.status && e.status >= 500) {
    return NextResponse.json(
      { error: `${op} 失败`, details: '存储上游错误' },
      { status: 502 }
    )
  }
  return NextResponse.json(
    { error: `${op} 失败` },
    { status: 500 }
  )
}

/** 重新导出供各路由直接使用 */
export { isStorageConfigured, getStorageProvider }

/** @deprecated 使用 storageNotConfigured 代替 */
export const webdavNotConfigured = storageNotConfigured

/** @deprecated 使用 storageErrorResponse 代替 */
export const webdavErrorResponse = storageErrorResponse

/**
 * 兼容旧调用:catch-all 路由可直接复用 apiHandler(已内置泛型)
 *
 * 旧的 catchAllHandler 包装器会在 apiHandler 和业务函数之间做 `as unknown as` 强转,
 * 借助 apiHandler<P> 现已原生支持 params 泛型,这里直接透传即可,无需再做强转。
 */
export const catchAllHandler = apiHandler
