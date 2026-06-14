/**
 * 存储提供者统一接口
 *
 * 抽象 WebDAV / Backblaze B2 等不同后端为统一操作接口。
 * 上层 API 路由、page-source、sync-pages 脚本均通过此接口访问存储，
 * 不再直接耦合具体后端实现。
 *
 * 设计原则:
 * - 接口方法尽量对齐现有 WebDAV 操作签名，减少调用方改动
 * - 每个方法独立可测试，不依赖全局状态
 * - 返回值类型与 lib/storage/types.ts 对齐
 */
import type { FileStat } from 'webdav'

/** 存储后端类型标识 */
export type StorageBackend = 'webdav' | 'backblaze'

/** 目录列表选项 */
export interface ListDirectoryOptions {
  /** 是否深度递归（仅 WebDAV 支持，B2 用 delimiter 模拟浅层列表） */
  deep?: boolean
}

/** 文件内容返回类型（与 webdav 客户端 getFileContents 对齐） */
export type FileContent = string | Buffer | ArrayBuffer | { data: string | Buffer | ArrayBuffer }

/**
 * 存储提供者接口
 *
 * 所有路径参数均为相对路径（无前导斜杠），与现有 WebDAV 客户端用法一致。
 */
export interface StorageProvider {
  /** 后端类型标识 */
  readonly backend: StorageBackend

  /** 检查当前后端是否已正确配置 */
  isConfigured(): boolean

  /**
   * 列出目录内容
   * @param dirPath 相对路径（空串代表根）
   * @param options 列表选项
   * @returns FileStat 数组（与 webdav 客户端 getDirectoryContents 对齐）
   */
  listDirectory(dirPath: string, options?: ListDirectoryOptions): Promise<FileStat[]>

  /**
   * 获取文件内容
   * @param filePath 相对路径
   * @param options 可选，包含 AbortSignal
   * @returns 文件内容（Buffer / string / ArrayBuffer）
   */
  getFileContents(filePath: string, options?: { signal?: AbortSignal }): Promise<FileContent>

  /**
   * 上传/覆盖文件
   * @param filePath 相对路径
   * @param data 文件内容
   * @param options 可选，包含 HTTP 回调
   */
  putFileContents(
    filePath: string,
    data: FileContent,
    options?: { headers?: Record<string, string> }
  ): Promise<void>

  /**
   * 创建目录
   * @param dirPath 相对路径
   * @param options 可选，包含 recursive 标志
   */
  createDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void>

  /**
   * 删除文件
   * @param filePath 相对路径
   */
  deleteFile(filePath: string): Promise<void>

  /**
   * 删除目录（仅空目录）
   * @param dirPath 相对路径
   */
  deleteDirectory(dirPath: string): Promise<void>

  /**
   * 获取文件/目录元信息
   * @param path 相对路径
   * @returns FileStat（与 webdav 客户端 stat 对齐）
   */
  stat(path: string): Promise<FileStat>
}

/** 当前激活的存储提供者单例 */
let activeProvider: StorageProvider | null = null

/**
 * 获取当前激活的存储提供者
 *
 * 根据 STORAGE_TYPE 环境变量决定使用哪个后端：
 * - 'backblaze' → B2Provider
 * - 其他或未设置 → WebDavProvider（向后兼容）
 */
export async function getStorageProvider(): Promise<StorageProvider> {
  if (activeProvider) return activeProvider

  const storageType = process.env.STORAGE_TYPE?.toLowerCase() ?? 'webdav'

  if (storageType === 'backblaze') {
    const { B2Provider } = await import('./b2')
    activeProvider = new B2Provider()
  } else {
    const { WebDavProvider } = await import('./webdav-provider')
    activeProvider = new WebDavProvider()
  }

  console.warn(`[storage] 激活后端: ${activeProvider.backend}`)
  return activeProvider
}

/**
 * 获取当前激活的存储提供者（同步版本）
 *
 * 仅在已初始化后使用。若未初始化则抛出错误。
 * 调用方应先调用 getStorageProvider() 确保 provider 已初始化。
 */
export function getStorageProviderSync(): StorageProvider {
  if (!activeProvider) {
    throw new Error('存储提供者未初始化')
  }
  return activeProvider
}

/**
 * 重置提供者单例（仅供测试使用）
 */
export function resetStorageProvider(): void {
  activeProvider = null
}

/**
 * 检查当前是否配置了存储后端
 */
export function isStorageConfigured(): boolean {
  const storageType = process.env.STORAGE_TYPE?.toLowerCase() ?? 'webdav'
  if (storageType === 'backblaze') {
    return !!(
      process.env.B2_KEY_ID &&
      process.env.B2_APP_KEY &&
      process.env.B2_BUCKET
    )
  }
  return !!(
    process.env.WEBDAV_URL &&
    process.env.WEBDAV_USER &&
    process.env.WEBDAV_PASS
  )
}
