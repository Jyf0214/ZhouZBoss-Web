/**
 * /admin/storage 顶层 state hook
 *
 * 职责:
 * - 加载 / 刷新文件夹 ACL 列表 + 配置状态
 * - 维护 currentPath / entries / 加载态 / 错误态
 * - 暴露业务操作(进入路径、上传、创建、删除、切换公开)
 * - 503 + code=NOT_CONFIGURED 自动收敛到 `configured=false`
 *
 * 设计原则:
 * - 不在 hook 内做 UI 提示(留给调用方)
 * - 不在 hook 内做导航(留给调用方)
 * - 错误一律抛 ApiError,调用方 try/catch + showError
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { StorageFolderMeta, WebDavEntry } from '@/lib/storage/types';
import type { DialogKind, DialogTarget } from './types';
import {
  ApiError,
  deleteFile,
  fetchConfig,
  fetchEntries,
  fetchFolders,
  mkdir,
  moveFile as apiMoveFile,
  patchFolderMeta,
  renameFolder as apiRenameFolder,
  rmdir,
  uploadFile,
} from './api-client';

interface UseStorageState {
  configured: boolean;
  folders: StorageFolderMeta[];
  currentPath: string;
  entries: WebDavEntry[];
  loading: boolean;
  error: string | null;
  dialog: DialogKind;
  pendingTarget: DialogTarget;
  /** 重置整个页面(重新拉 config + folders + 当前路径) */
  refreshAll: () => Promise<void>;
  /** 仅刷新当前路径文件列表(不重新拉 config/folders) */
  loadEntries: (path: string) => Promise<void>;
  /** 切换浏览路径 */
  navigateTo: (path: string) => Promise<void>;
  /** 打开 / 关闭对话框 */
  openDialog: (kind: Exclude<DialogKind, null>, target?: DialogTarget) => void;
  closeDialog: () => void;
  /** 上传文件(支持多个) */
  uploadFiles: (files: File[]) => Promise<void>;
  /** 创建文件夹 */
  createFolder: (name: string) => Promise<void>;
  /** 删除文件 */
  removeFile: (path: string) => Promise<void>;
  /** 删除文件夹 */
  removeFolder: (path: string) => Promise<void>;
  /** 切换文件夹公开/私有 */
  toggleFolderPublic: (
    path: string,
    next: boolean
  ) => Promise<StorageFolderMeta | null>;
  /** 设置/清除子文件夹密码(password=null 表示清除) */
  setFolderPassword: (
    path: string,
    password: string | null
  ) => Promise<StorageFolderMeta | null>;
  /** 重命名文件夹 */
  renameFolder: (path: string, newName: string) => Promise<boolean>;
  /** 移动文件/文件夹到目标目录 */
  moveFileItem: (path: string, destination: string) => Promise<boolean>;
  /** 排序字段 */
  sortField: SortField;
  /** 排序方向 */
  sortDirection: SortDirection;
  /** 切换排序(点击相同字段切换方向,不同字段重置为 asc) */
  toggleSort: (field: SortField) => void;
}

export type SortField = 'name' | 'size' | 'date';
export type SortDirection = 'asc' | 'desc';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function useStorageState(): UseStorageState {
  const [configured, setConfigured] = useState(true); // 默认乐观开启,加载失败再降级
  const [folders, setFolders] = useState<StorageFolderMeta[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<WebDavEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pendingTarget, setPendingTarget] = useState<DialogTarget>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const hasFetched = useRef(false);

  /**
   * 并行加载 config + folders
   *
   * - 503+NOT_CONFIGURED 视为降级:仍加载 folders(数据库元数据可读)
   * - 其它错误通过 error 状态展示
   */
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    let nextConfigured = true;
    let nextFolders: StorageFolderMeta[] = [];
    const errors: string[] = [];

    try {
      const cfg = await fetchConfig();
      nextConfigured = !!cfg.configured;
    } catch (err) {
      if (err instanceof ApiError && err.isNotConfigured) {
        nextConfigured = false;
      } else {
        errors.push(err instanceof Error ? err.message : '配置加载失败');
      }
    }

    try {
      const result = await fetchFolders();
      // 防御：API 可能返回非数组（如 204 空响应或意外格式）
      nextFolders = Array.isArray(result) ? result : [];
    } catch (err) {
      if (err instanceof ApiError && err.isNotConfigured) {
        nextConfigured = false;
      } else {
        errors.push(err instanceof Error ? err.message : '文件夹加载失败');
      }
    }

    setConfigured(nextConfigured);
    setFolders(nextFolders);
    if (errors.length > 0) setError(errors.join('; '));
    setLoading(false);
    hasFetched.current = true;
  }, []);

  /** 加载当前路径文件列表 */
  const loadEntries = useCallback(async (path: string) => {
    try {
      const res = await fetchEntries(path);
      // 防御：API 可能返回 undefined（如 204 空响应）
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
    } catch (err) {
      setEntries([]);
      if (err instanceof ApiError && err.isNotConfigured) {
        setConfigured(false);
        return;
      }
      if (err instanceof Error) {
        message.error(err.message);
      } else {
        message.error('文件列表加载失败');
      }
    }
  }, []);

  /** 进入指定路径(刷新对应 entries) */
  const navigateTo = useCallback(
    async (path: string) => {
      setCurrentPath(path);
      await loadEntries(path);
    },
    [loadEntries]
  );

  /** 初次挂载加载; loadInitial 完成后拉取根目录文件列表
   *  (hasFetched 是 ref 不触发 re-render, 必须在此显式调用) */
  useEffect(() => {
    if (!hasFetched.current) {
      void loadInitial().then(() => {
        void loadEntries(currentPath);
      });
    }
  }, [loadInitial, loadEntries, currentPath]);

  /** 进入后默认加载 entries(currentPath 变化时触发) */
  useEffect(() => {
    void loadEntries(currentPath);
  }, [currentPath, loadEntries]);

  const refreshAll = useCallback(async () => {
    await loadInitial();
    await loadEntries(currentPath);
  }, [currentPath, loadEntries, loadInitial]);

  const openDialog = useCallback(
    (kind: Exclude<DialogKind, null>, target: DialogTarget = null) => {
      setDialog(kind);
      setPendingTarget(target);
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
    setPendingTarget(null);
  }, []);

  /** 上传文件(支持多个,串行处理) */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      if (!configured) {
        message.error('存储后端未配置,无法上传');
        return;
      }
      const oversize = files.find((f) => f.size > MAX_FILE_SIZE);
      if (oversize) {
        message.error(`文件 "${oversize.name}" 超过 50MB 限制`);
        return;
      }
      const errors: string[] = [];
      for (const file of files) {
        try {
          await uploadFile(currentPath, file);
        } catch (err) {
          if (err instanceof ApiError) {
            if (err.isNotConfigured) {
              setConfigured(false);
              message.error('存储后端未配置,上传失败');
              return;
            }
            errors.push(err.message);
          } else {
            errors.push(err instanceof Error ? err.message : `上传失败: ${file.name}`);
          }
        }
      }
      const success = files.length - errors.length;
      if (errors.length === 0) {
        message.success(`上传成功 (${files.length} 个文件)`);
      } else if (success > 0) {
        message.warning(`部分上传失败 (成功 ${success}，失败 ${errors.length})`);
      } else {
        message.error(`上传失败 (${errors.length} 个文件)`);
      }
      await loadEntries(currentPath);
      // 重新拉一次 folders(可能因上传自动创建了文件夹元数据)
      try {
        const list = await fetchFolders();
        setFolders(list);
      } catch {
        // 忽略 — 后续操作会自然刷新
      }
    },
    [configured, currentPath, loadEntries]
  );

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        message.error('文件夹名不能为空');
        return;
      }
      if (!configured) {
        message.error('存储后端未配置,无法创建');
        return;
      }
      const fullPath = currentPath ? `${currentPath}/${trimmed}` : trimmed;
      try {
        const meta = await mkdir(fullPath);
        setFolders((prev) => {
          const idx = prev.findIndex((f) => f.path === meta.path);
          if (idx === -1) return [...prev, meta];
          const next = prev.slice();
          next[idx] = meta;
          return next;
        });
        message.success('文件夹创建成功');
        closeDialog();
        await loadEntries(currentPath);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            message.error('存储后端未配置');
            return;
          }
          message.error(err.message);
        } else {
          message.error('创建失败');
        }
      }
    },
    [configured, currentPath, loadEntries, closeDialog]
  );

  const removeFile = useCallback(
    async (path: string) => {
      if (!configured) {
        message.error('存储后端未配置,无法删除');
        return;
      }
      try {
        await deleteFile(path);
        message.success('删除成功');
        closeDialog();
        await loadEntries(currentPath);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            return;
          }
          message.error(err.message);
        } else {
          message.error('删除失败');
        }
      }
    },
    [configured, currentPath, loadEntries, closeDialog]
  );

  const removeFolder = useCallback(
    async (path: string) => {
      if (!configured) {
        message.error('存储后端未配置,无法删除');
        return;
      }
      try {
        await rmdir(path);
        setFolders((prev) => prev.filter((f) => f.path !== path));
        message.success('删除成功');
        closeDialog();
        if (currentPath === path) {
          await navigateTo('');
        } else {
          await loadEntries(currentPath);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            return;
          }
          message.error(err.message);
        } else {
          message.error('删除失败');
        }
      }
    },
    [configured, currentPath, loadEntries, closeDialog, navigateTo]
  );

  const toggleFolderPublic = useCallback(
    async (path: string, next: boolean) => {
      if (!configured) {
        message.error('存储后端未配置,无法切换');
        return null;
      }
      try {
        const meta = await patchFolderMeta(path, { public: next });
        setFolders((prev) => {
          const idx = prev.findIndex((f) => f.path === meta.path);
          if (idx === -1) return [...prev, meta];
          const nextList = prev.slice();
          nextList[idx] = meta;
          return nextList;
        });
        message.success('设置已更新');
        return meta;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            return null;
          }
          message.error(err.message);
        } else {
          message.error('更新失败');
        }
        return null;
      }
    },
    [configured]
  );

  const setFolderPassword = useCallback(
    async (path: string, password: string | null) => {
      if (!configured) {
        message.error('存储后端未配置,无法设置密码');
        return null;
      }
      try {
        const meta = await patchFolderMeta(path, { password });
        setFolders((prev) => {
          const idx = prev.findIndex((f) => f.path === meta.path);
          if (idx === -1) return [...prev, meta];
          const nextList = prev.slice();
          nextList[idx] = meta;
          return nextList;
        });
        message.success('设置已更新');
        return meta;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            return null;
          }
          message.error(err.message);
        } else {
          message.error('更新失败');
        }
        return null;
      }
    },
    [configured]
  );

  const renameFolderCallback = useCallback(
    async (path: string, newName: string): Promise<boolean> => {
      if (!configured) {
        message.error('存储后端未配置,无法重命名');
        return false;
      }
      try {
        const meta = await apiRenameFolder(path, newName);
        // 更新 folders 列表
        setFolders((prev) => {
          // 移除旧路径
          const filtered = prev.filter((f) => f.path !== path);
          // 检查是否已存在(防御)
          const idx = filtered.findIndex((f) => f.path === meta.path);
          if (idx === -1) return [...filtered, meta];
          const next = filtered.slice();
          next[idx] = meta;
          return next;
        });
        // 如果当前浏览路径受影响,更新路径
        setCurrentPath((prev) => {
          if (prev === path) return meta.path;
          if (prev.startsWith(`${path}/`)) {
            return meta.path + prev.slice(path.length);
          }
          return prev;
        });
        message.success('重命名成功');
        closeDialog();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            return false;
          }
          message.error(err.message);
        } else {
          message.error('重命名失败');
        }
        return false;
      }
    },
    [configured, closeDialog]
  );

  const moveFileItemCallback = useCallback(
    async (path: string, destination: string): Promise<boolean> => {
      if (!configured) {
        message.error('存储后端未配置,无法移动');
        return false;
      }
      try {
        await apiMoveFile(path, destination);
        // 移动成功后刷新当前目录
        await loadEntries(currentPath);
        // 如果移动的是文件夹,也刷新文件夹列表
        if (!path.includes('.')) {
          try {
            const result = await fetchFolders();
            setFolders(Array.isArray(result) ? result : []);
          } catch { /* 忽略文件夹刷新失败 */ }
        }
        message.success('移动成功');
        closeDialog();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isNotConfigured) {
            setConfigured(false);
            return false;
          }
          message.error(err.message);
        } else {
          message.error('移动失败');
        }
        return false;
      }
    },
    [configured, currentPath, closeDialog, loadEntries]
  );

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  return {
    configured,
    folders,
    currentPath,
    entries,
    loading,
    error,
    dialog,
    pendingTarget,
    refreshAll,
    loadEntries,
    navigateTo,
    openDialog,
    closeDialog,
    uploadFiles,
    createFolder,
    removeFile,
    removeFolder,
    toggleFolderPublic,
    setFolderPassword,
    renameFolder: renameFolderCallback,
    moveFileItem: moveFileItemCallback,
    sortField,
    sortDirection,
    toggleSort,
  };
}
