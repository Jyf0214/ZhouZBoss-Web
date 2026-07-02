/**
 * /admin/storage 本地类型
 *
 * 仅供本页面内部使用,跨模块共享的类型请见 `@/lib/storage/types`。
 */
import type { StorageFolderMeta, WebDavEntry } from '@/lib/storage/types';

/** 顶部对话框类型(互斥) */
export type DialogKind =
  | 'upload'
  | 'mkdir'
  | 'delete-file'
  | 'delete-folder'
  | 'rename'
  | 'move'
  | 'settings'
  | null;

/** 待操作目标(文件/文件夹路径) */
export type DialogTarget = string | null;

/** 配置状态 */
export interface StorageConfig {
  configured: boolean;
  folderCount: number;
}

/** 公开 / 私有切换所需的元数据 */
export type FolderMetaMap = Record<string, StorageFolderMeta>;

/** 页面状态快照(只读,供子组件消费) */
export interface StorageState {
  configured: boolean;
  folders: StorageFolderMeta[];
  currentPath: string;
  entries: WebDavEntry[];
  loading: boolean;
  error: string | null;
}

/** PATCH /api/storage/folder/[...path] 请求体 */
export interface UpdateFolderPayload {
  public?: boolean;
  description?: string | null;
  /** 显式设置/清除子文件夹访问密码:null 表示清除 */
  password?: string | null;
}

/** 扩展的文件夹元数据,包含 hasPassword(由其他 Agent 追加) */
export interface StorageFolderMetaWithPassword extends StorageFolderMeta {
  hasPassword?: boolean;
}
