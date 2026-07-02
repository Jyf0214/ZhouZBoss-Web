/**
 * 左侧文件夹树
 *
 * - 只有一级子文件夹被认定为“项目”
 * - 选中项目时，展开其内部结构 (仅展开一层)
 * - 项目根目录具有特殊视觉样式 (加粗 + 蓝色)
 * - 实现层级缩进
 */
'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { Folder, Globe, Lock, PenLine, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { Tooltip } from 'antd';
import type { StorageFolderMeta, WebDavEntry } from '@/lib/storage/types';
import { Tag } from '@/components/ui/Tag';

/** 系统保留目录 */
const SYSTEM_FOLDERS = new Set(['pages']);

interface Props {
  folders: StorageFolderMeta[];
  currentPath: string;
  rootLabel: string;
  publicLabel: string;
  privateLabel: string;
  renameLabel: string;
  onNavigate: (path: string) => void;
  onNewFolder: () => void;
  onRename: (path: string) => void;
  disabled?: boolean;
  projectContents: Record<string, WebDavEntry[]>;
  onFetchProjectContents: (path: string) => Promise<void>;
}

/** 渲染状态标签 */
function FolderStatusTag({
  publicStatus,
  path,
  publicLabel,
  privateLabel,
}: {
  publicStatus: boolean | undefined;
  path: string;
  publicLabel: string;
  privateLabel: string;
}) {
  if (publicStatus === undefined || SYSTEM_FOLDERS.has(path)) return null;
  return (
    <Tag
      size="sm"
      variant={publicStatus ? 'emerald' : 'light'}
      className="shrink-0"
    >
      <span className="inline-flex items-center gap-1">
        {publicStatus ? <Globe size={10} /> : <Lock size={10} />}
        {publicStatus ? publicLabel : privateLabel}
      </span>
    </Tag>
  );
}

/** 递归项组件 */
function FolderTreeItem({
  entry,
  depth,
  isProject,
  active,
  publicLabel,
  privateLabel,
  renameLabel,
  onNavigate,
  onRename,
  disabled,
  children,
}: {
  entry: { path: string; filename: string; isDirectory: boolean; public?: boolean },
  depth: number,
  isProject: boolean,
  active: boolean,
  publicLabel: string,
  privateLabel: string,
  renameLabel: string,
  onNavigate: (path: string) => void,
  onRename: (path: string) => void,
  disabled: boolean,
  children?: WebDavEntry[],
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="flex flex-col">
      <li className="group/folder relative">
        <button
          type="button"
          onClick={() => onNavigate(entry.path)}
          className={[
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            active
              ? 'bg-zinc-100 text-zinc-900 font-semibold'
              : 'text-zinc-700 hover:bg-zinc-50',
            isProject && 'font-bold text-zinc-900',
          ].join(' ')}
          style={{ paddingLeft: `${20 * depth + 12}px` }}
        >
          {/* 展开/收起箭头 */}
          <div className="w-4 h-4 flex items-center justify-center mr-1">
            {entry.isDirectory && (
              <button
                type="button"
                onClick={handleToggle}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
          <Folder
            size={14}
            className={[
              active ? 'text-zinc-700' : 'text-zinc-400',
              isProject && 'text-blue-500',
            ].join(' ')}
          />
          <span className="flex-1 text-left min-w-0 break-all">
            {entry.filename}
          </span>
          <FolderStatusTag
            publicStatus={entry.public}
            path={entry.path}
            publicLabel={publicLabel}
            privateLabel={privateLabel}
          />
        </button>
        {!disabled && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 transition-opacity">
            <Tooltip title={renameLabel} placement="right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(entry.path);
                }}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
              >
                <PenLine size={12} />
              </button>
            </Tooltip>
          </div>
        )}
      </li>
      {isExpanded && children && children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) => {
            const fullPath = entry.path
              ? `${entry.path}/${child.filename}`
              : child.filename;
            return (
              <FolderTreeItem
                key={child.basename}
                entry={{
                  path: fullPath,
                  filename: child.filename,
                  isDirectory: child.isDirectory,
                  public: undefined,
                }}
                depth={depth + 1}
                isProject={false}
                active={false}
                publicLabel={publicLabel}
                privateLabel={privateLabel}
                renameLabel={renameLabel}
                onNavigate={onNavigate}
                onRename={onRename}
                disabled={disabled}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function StorageFolderTree({
  folders,
  currentPath,
  rootLabel,
  publicLabel,
  privateLabel,
  renameLabel,
  onNavigate,
  onNewFolder,
  onRename,
  disabled = false,
  projectContents,
  onFetchProjectContents,
}: Props) {
  // 判定是否为“项目”：必须是一级子文件夹 (不含 '/')
  const isProject = useCallback((path: string) => {
    if (!path) return false;
    return !path.includes('/');
  }, []);

  // 当选中一个项目时，触发加载其子项
  useEffect(() => {
    if (currentPath && isProject(currentPath)) {
      void onFetchProjectContents(currentPath);
    }
  }, [currentPath, isProject, onFetchProjectContents]);

  const isRootActive = currentPath === '';

  // 过滤出顶级文件夹 (没有父目录的)
  const topLevelFolders = useMemo(() => {
    return folders.filter(f => !f.path.includes('/'));
  }, [folders]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {rootLabel}
        </span>
        <button
          type="button"
          onClick={onNewFolder}
          disabled={disabled}
          title={disabled ? '存储后端未配置' : '新建文件夹'}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <button
          type="button"
          onClick={() => onNavigate('')}
          className={[
            'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors',
            isRootActive
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-700 hover:bg-zinc-50',
          ].join(' ')}
        >
          <Folder size={14} className={isRootActive ? 'text-white' : 'text-zinc-400'} />
          <span className="flex-1 text-left font-medium">{rootLabel}</span>
        </button>

        {topLevelFolders.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">
            暂无文件夹
          </div>
        ) : (
          <ul className="mt-1 space-y-0.5 px-2">
            {topLevelFolders.map((folder: StorageFolderMeta) => {
              const active = currentPath === folder.path;
              const project = isProject(folder.path);
              const children = project ? projectContents[folder.path] : undefined;

              return (
                <FolderTreeItem
                  key={folder.path}
                  entry={{
                    path: folder.path,
                    filename: folder.path.split('/').at(-1) ?? folder.path,
                    isDirectory: true,
                    public: folder.public,
                  }}
                  depth={0}
                  isProject={project}
                  active={active}
                  publicLabel={publicLabel}
                  privateLabel={privateLabel}
                  renameLabel={renameLabel}
                  onNavigate={onNavigate}
                  onRename={onRename}
                  disabled={disabled}
                  children={children}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default StorageFolderTree;
