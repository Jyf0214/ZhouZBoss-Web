/**
 * 存储池 ACL(访问控制)模块
 *
 * 核心原则:
 * - 未配置的文件夹默认私有(失败安全)
 * - 文件夹元数据走 Prisma `storageFolder` 表(StorageFolder model)
 * - 数据库未配置(`db.prisma` 为 null) → 视为「未配置」,所有读函数返回 false
 * - 顶层文件夹可见性决定子项:子路径与顶层共享同一权限
 */
import { getDb } from '@/lib/db'
import { isStorageConfigured } from '@/lib/storage/storage-provider'
import { verifyPassword } from '@/lib/hash'
import { splitDirFilename } from './path'
import type { AccessResult, StorageFolderMeta } from './types'
import { PAGES_PREFIX, isHtmlPath } from '@/lib/page-source/shared'
import { checkCustomPageAccess, type ApiKeyPermissions } from '@/lib/api-key-permissions'

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
 * 从 Prisma `storageFolder` 表读取单条文件夹元数据
 *
 * 返回值:
 * - 找到 → 标准化为 `StorageFolderMeta`(Date 类型)
 * - 数据库未配置 → null
 * - 记录不存在 → null
 * - 异常 → null(失败安全)
 */
async function readFolderMetaFromDb(path: string): Promise<StorageFolderMeta | null> {
  const prisma = getDb().prisma
  if (!prisma) return null
  try {
    const row = await prisma.storageFolder.findUnique({ where: { path } })
    if (!row) return null
    return {
      path: row.path,
      public: row.public,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  } catch {
    // 读取异常视为不存在(失败安全)
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
  if (!isStorageConfigured()) {
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

/* ---------------------------------------------------------------------------
 * 自定义 Page 私有化(密码保护)专用 ACL
 *
 * 与存储池 ACL 的核心差异:
 * - 存储池 ACL 是「顶层文件夹共享可见性」,且未配置默认私有
 * - Page ACL 是「页面所在目录元数据驱动」,未配置默认公开
 *   (未配置页面按「无可见性配置」处理,符合「无配置 = 不限制」语义)
 * - 额外支持单目录密码:目录 `public=false` 时,必须输入密码才能查看
 *
 * 设计原则:
 * - 失败安全:DB 异常时不允许访问,等同「需要密码」
 * - 密码使用 scrypt 哈希存储,验证通过 `verifyPassword` 常量时间比较
 * - 与现有 `checkAccess` 完全解耦,不动其行为
 * ------------------------------------------------------------------------- */

/** 自定义 Page 访问决策结果 */
export interface PageAccessResult {
  allowed: boolean
  reason: 'public' | 'password-required' | 'wrong-password' | 'db-error' | 'db-not-configured'
}

/** 私有页面密码最大长度(防滥用,128 字符足够) */
const PAGE_PASSWORD_MAX_LEN = 128

/**
 * 从页面完整路径提取项目文件夹路径(用于查询 `StorageFolder` 元数据)
 *
 * 取 `pages/` 后的第一级目录作为权限判断依据:
 * - `pages/hello/index.html` → `pages/hello`
 * - `pages/hello`            → `pages/hello`
 * - `pages/hello/deep/x.html` → `pages/hello`（只看第一级）
 * - `pages/about.html`        → `pages`（根级文件，回退到 pages 本身）
 */
export function getPageProjectFolder(fullPath: string): string {
  const normalized = fullPath.replace(/^[\\/]+|[\\/]+$/g, '')
  const prefix = `${PAGES_PREFIX}/`
  if (!normalized.startsWith(prefix)) {
    return splitDirFilename(normalized).dir
  }
  const rest = normalized.slice(prefix.length)
  const firstSlash = rest.indexOf('/')
  if (firstSlash === -1) {
    // 无子路径：含扩展名 → 根级文件(pages/secret.html → pages)
    //             无扩展名 → 目录名(pages/hello → pages/hello)
    return isHtmlPath(rest) ? PAGES_PREFIX : `${PAGES_PREFIX}/${rest}`
  }
  const firstLevel = rest.substring(0, firstSlash)
  return `${PAGES_PREFIX}/${firstLevel}`
}

/**
 * 自定义 Page 专用 ACL 检查
 *
 * 决策树(按顺序匹配,首个命中即返回):
 * 1. DB 未配置(`getDb().prisma` 为 null) → 拒绝访问 → `{ allowed: false, reason: 'db-not-configured' }`
 * 2. DB 调用异常 → `{ allowed: false, reason: 'db-error' }`(失败安全)
 * 3. 记录不存在 → 拒绝访问 → `{ allowed: false, reason: 'db-not-configured' }`
 * 4. 记录存在,`public=true` → `{ allowed: true, reason: 'public' }`
 * 5. 记录存在,`public=false`,`password=null` → `{ allowed: false, reason: 'password-required' }`
 * 6. 记录存在,`public=false`,`password` 已设:
 *    - `queryPwd` 通过 `verifyPassword` 常量时间哈希验证 → `{ allowed: true, reason: 'public' }`
 *    - 其他情况(含 `queryPwd` 为 null) → `{ allowed: false, reason: 'wrong-password' }`
 *
 * 异常保护:整段逻辑被 try/catch 包裹,任何未捕获异常都返回
 * `{ allowed: false, reason: 'db-error' }`,与 `db-error` 等价,等同 `password-required`。
 */
export async function checkPageAccess(
  fullPath: string,
  queryPwd: string | null
): Promise<PageAccessResult> {
  // 1. 数据库未配置 → 拒绝访问(失败安全)
  const prisma = getDb().prisma
  if (!prisma) {
    return { allowed: false, reason: 'db-not-configured' }
  }

  try {
    // 2. 查询页面所在项目文件夹的元数据（只看 pages/ 下第一级目录）
    const dir = getPageProjectFolder(fullPath)
    const row = await prisma.storageFolder.findUnique({ where: { path: dir } })

    // 3. 无记录 → 拒绝访问(失败安全,无配置 = 未知权限状态)
    if (!row) {
      return { allowed: false, reason: 'db-not-configured' }
    }

    // 4. 标记为公开 → 直接放行
    if (row.public) {
      return { allowed: true, reason: 'public' }
    }

    // 5. 私有且未设密码 → 要求密码
    if (!row.password) {
      return { allowed: false, reason: 'password-required' }
    }

    // 6. 私有且设了密码 → 使用 scrypt 常量时间比较验证
    if (
      typeof queryPwd === 'string' &&
      queryPwd.length > 0 &&
      queryPwd.length <= PAGE_PASSWORD_MAX_LEN &&
      await verifyPassword(queryPwd, row.password)
    ) {
      return { allowed: true, reason: 'public' }
    }
    return { allowed: false, reason: 'wrong-password' }
  } catch {
    // 任何未捕获异常:失败安全,等同 password-required
    return { allowed: false, reason: 'db-error' }
  }
}

/* ---------------------------------------------------------------------------
 * API 密钥自定义页面权限检查
 *
 * 用于 API 路由层:当请求通过 API 密钥认证时,检查该密钥是否有权操作
 * 指定文件夹下的自定义页面。
 *
 * 决策逻辑:
 * - Cookie 认证(keyId===null) → 始终允许(管理员完整权限)
 * - API 密钥无权限配置 → 允许(向后兼容)
 * - API 密钥有权限配置 → 调用 checkCustomPageAccess() 检查文件夹级权限
 *
 * @returns true=允许, false=拒绝
 * ------------------------------------------------------------------------- */
export function checkApiKeyPageAccess(
  keyId: string | null,
  permissions: ApiKeyPermissions | null | undefined,
  pagePath: string,
  isWrite: boolean,
): boolean {
  // Cookie 认证，不受限制
  if (keyId === null) return true
  // 无权限配置，全部权限
  if (!permissions) return true

  // 从页面路径提取文件夹路径(用于权限匹配)
  const folderPath = getPageProjectFolder(pagePath)
  return checkCustomPageAccess(keyId, permissions, folderPath, isWrite)
}
