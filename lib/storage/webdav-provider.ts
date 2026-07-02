/**
 * WebDAV 存储提供者
 *
 * 封装现有 WebDAV 客户端为 StorageProvider 接口，
 * 行为与原始 lib/webdav.ts 完全一致。
 *
 * 设计:薄封装层，不改变任何现有逻辑，
 * 仅将 WebDAVClient 方法映射到 StorageProvider 接口。
 */
import type { FileStat } from 'webdav'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import type {
  StorageProvider,
  ListDirectoryOptions,
  FileContent,
} from './storage-provider'

/**
 * WebDAV 存储提供者
 *
 * 直接代理 lib/webdav.ts 的 WebDAVClient 实例，
 * 保持与现有代码 100% 行为兼容。
 */
export class WebDavProvider implements StorageProvider {
  readonly backend = 'webdav' as const

  isConfigured(): boolean {
    return isWebDavConfigured()
  }

  async listDirectory(dirPath: string, options?: ListDirectoryOptions): Promise<FileStat[]> {
    const client = getWebDavClient()
    const result = await client.getDirectoryContents(dirPath, {
      deep: options?.deep ?? false,
    })

    if (Array.isArray(result)) {
      return result
    }
    return []
  }

  async getFileContents(filePath: string, options?: { signal?: AbortSignal }): Promise<FileContent> {
    const client = getWebDavClient()
    return client.getFileContents(filePath, { signal: options?.signal })
  }

  async putFileContents(
    filePath: string,
    data: FileContent,
    options?: { headers?: Record<string, string> }
  ): Promise<void> {
    const client = getWebDavClient()
    // FileContent 包含 { data: ... } 联合类型，需要展平
    const flat = typeof data === 'object' && data !== null && 'data' in data
      ? data.data
      : data
    await client.putFileContents(filePath, flat, {
      headers: options?.headers,
    })
  }

  async createDirectory(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const client = getWebDavClient()
    await client.createDirectory(dirPath, {
      recursive: options?.recursive ?? false,
    })
  }

  async deleteFile(filePath: string): Promise<void> {
    const client = getWebDavClient()
    await client.deleteFile(filePath)
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const client = getWebDavClient()
    // 递归列出目录所有内容，按深度倒序删除（先删子文件/子目录，再删父目录）
    const contents = await client.getDirectoryContents(dirPath, { deep: true })
    if (Array.isArray(contents)) {
      const entries = contents
        .filter((e) => e.filename !== dirPath && e.filename !== dirPath + '/')
        .sort((a, b) => b.filename.localeCompare(a.filename))
      for (const entry of entries) {
        if (entry.type === 'directory') {
          await client.deleteFile(entry.filename)
        } else {
          await client.deleteFile(entry.filename)
        }
      }
    }
    await client.deleteFile(dirPath)
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const client = getWebDavClient()
    await client.moveFile(fromPath, toPath)
  }

  async stat(path: string): Promise<FileStat> {
    const client = getWebDavClient()
    const result = await client.stat(path)
    // getDirectoryContents 可能返回 ResponseDataDetailed，只取 FileStat 部分
    if (Array.isArray(result)) {
      // 不应该发生，stat 返回单个对象
      throw new Error('stat 返回了意外的数组类型')
    }
    return result as FileStat
  }
}
