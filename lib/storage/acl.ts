/**
 * 存储池 ACL(访问控制)模块
 *
 * 核心原则:
 * - 未配置的文件夹默认私有(失败安全)
 * - 所有 DB 调用走 `getDb()` 抽象,不直接耦合 Prisma
 * - 顶层文件夹可见性决定子项:子路径与顶层共享同一权限
 */
import { getDb } from '@/lib/db'
import { isWebDavConfigured } from '@/lib/webdav'
import type { AccessResult, StorageFolderMeta } from './types'

/** 存储池文件夹元数据在 KV 中的前缀 */
const STORAGE_FOLDER_META_PREFIX = 'storage-folder-meta:'

/**
 * 规范化路径:去除前导/尾随斜杠,空字符串代表根
 *
 * @example
 * normalizePath('/a/b/')  // 'a/b'
 * normalizePath('a/b')    // 'a/b'
 * normalizePath('')       // ''
 * normalizePath('///')    // ''
 */
export function normalizePath(path: string): string {
  return path.replace(/^[\\/]+|[\\/]+$/g, '')
}

/**
 * 提取顶层文件夹名
 *
 * - `covers/2024/img.png` → `'covers'`
 * - `img.png` → `''`(顶层文件,根目录)
 * - `''` → `''`
 * - `/a/b` → `'a'`(先规范化)
 */
export function getTopLevelFolder(path: string): string {
  const normalized = normalizePath(path)
  if (!normalized) return ''
  const firstSlash = normalized.indexOf('/')
  if (firstSlash === -1) return ''
  return normalized.substring(0, firstSlash)
}

/**
 * 从 KV 读取文件夹元数据(原始 JSON 形态)
 *
 * 内部辅助函数,不做错误吞噬,只捕获 JSON 解析失败。
 */
interface StoredFolderMeta {
  path: string
  public: boolean
  description: string | null
  createdAt: string
  updatedAt: string
}

async function readFolderMetaFromDb(path: string): Promise<StorageFolderMeta | null> {
  const db = getDb()
  const key = `${STORAGE_FOLDER_META_PREFIX}${path}`
  const raw = await db.get(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredFolderMeta
    return {
      path: parsed.path,
      public: parsed.public,
      description: parsed.description,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    }
  } catch {
    // 损坏数据视为不存在(失败安全)
    return null
  }
}

/**
 * 检查数据库中是否存在该路径的文件夹元数据
 *
 * 仅当数据库中有显式记录时才返回 true;
 * 未配置 → false;读取异常 → false(失败安全)。
 */
export async function isFolderConfigured(path: string): Promise<boolean> {
  const meta = await readFolderMetaFromDb(path)
  return meta !== null
}

/**
 * 检查文件夹是否对未登录用户公开
 *
 * - 未配置 → false(默认私有,失败安全)
 * - 配置但 public=false → false
 * - 配置且 public=true → true
 * - 异常 → false(失败安全)
 */
export async function isFolderPublic(path: string): Promise<boolean> {
  try {
    const meta = await readFolderMetaFromDb(path)
    if (!meta) return false
    return meta.public
  } catch {
    return false
  }
}

/**
 * 综合 ACL 校验入口
 *
 * 决策树:
 * 1. WebDAV 未配置 → 拒绝(返回 `not-configured`)
 * 2. 路径为空或仅含分隔符(根目录) → 拒绝(返回 `not-found`)
 *    根目录属于管理员自留,不允许公开访问
 * 3. 提取顶层文件夹 → 检查其是否 public
 *    - 数据库无记录 → 私有
 *    - 记录存在但 public=false → 私有
 *    - 记录存在且 public=true → 允许未登录访问
 * 4. 已登录用户 → 顶层文件夹存在的即可访问(未配置也允许管理员本地)
 *
 * 任何读取异常 → 拒绝(失败安全)
 */
export async function checkAccess(
  relativePath: string,
  isAuthenticated: boolean
): Promise<AccessResult> {
  // 1. 模块未配置
  if (!isWebDavConfigured()) {
    return { allowed: false, reason: 'not-configured' }
  }

  // 2. 规范化路径
  const normalized = normalizePath(relativePath)
  if (!normalized) {
    return { allowed: false, reason: 'not-found' }
  }

  // 3. 提取顶层文件夹
  const topLevel = getTopLevelFolder(normalized)
  if (!topLevel) {
    // 顶层文件(根目录下)默认私有,需登录
    if (isAuthenticated) return { allowed: true }
    return { allowed: false, reason: 'not-found' }
  }

  // 4. 查询顶层文件夹元数据(失败安全)
  let publicAccess = false
  try {
    publicAccess = await isFolderPublic(topLevel)
  } catch {
    return { allowed: false, reason: 'private' }
  }

  // 5. 决策
  if (publicAccess) return { allowed: true }
  if (isAuthenticated) return { allowed: true }
  return { allowed: false, reason: 'private' }
}
