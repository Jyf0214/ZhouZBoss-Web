/**
 * 存储池(WebDAV)模块共享类型定义
 *
 * 本文件只声明类型,不包含任何运行时逻辑。
 * 给后续 Agent 实现的 API 路由、/files 代理、/admin/storage 页面共用。
 */

/** WebDAV 文件/目录项(标准化后的视图) */
export interface WebDavEntry {
  /** 文件名(不含路径) */
  filename: string
  /** 完整路径(以 / 开头) */
  basename: string
  /** 是否为目录 */
  isDirectory: boolean
  /** 文件大小(字节),目录为 0 */
  size: number
  /** 最后修改时间(ISO 字符串) */
  lastModified: string
  /** MIME 类型(目录为 null) */
  mimeType: string | null
}

/** 文件夹元数据(数据库 row 形态) */
export interface StorageFolderMeta {
  /** 文件夹相对路径(无前导/尾随斜杠,顶层为空字符串) */
  path: string
  /** 是否对未登录用户可见 */
  public: boolean
  /** 描述(可选) */
  description: string | null
  createdAt: Date
  updatedAt: Date
}

/** ACL 校验结果:联合类型,避免布尔歧义 */
export type AccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'not-found' | 'private' | 'not-configured' }
