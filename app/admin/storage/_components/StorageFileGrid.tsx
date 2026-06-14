/**
 * 右侧文件网格 — 列出当前路径条目,网格布局
 *
 * - 空时展示 EmptyState
 * - 单个目录/文件用 StorageFileCard 渲染
 * - 点击文件名 = 进入目录 / 复制 URL
 * - 刷新时容器内局部加载，不替换整个页面
 * - 文件夹内顶部/底部显示快捷创建按钮
 */
'use client';

import { FolderPlus, Inbox, RefreshCw, Upload } from 'lucide-react';
import { Tooltip } from 'antd';
import type { WebDavEntry } from '@/lib/storage/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { StorageFileCard } from './StorageFileCard';
import type { DialogKind, DialogTarget } from '../_lib/types';

interface Props {
  entries: WebDavEntry[];
  loading: boolean;
  refreshing: boolean;
  appUrl: string;
  currentPath: string;
  copyUrlLabel: string;
  copiedLabel: string;
  deleteLabel: string;
  refreshLabel: string;
  newFolderLabel: string;
  uploadLabel: string;
  noFilesLabel: string;
  noFilesHint: string;
  onNavigate: (path: string) => void;
  onDelete: (entry: WebDavEntry) => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  disabled?: boolean;
}

/** 加载旋转指示器（容器内局部使用） */
function LoadingSpinner() {
  return (
    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
      <RefreshCw size={20} className="text-zinc-400 animate-spin" />
    </div>
  );
}

/** 创建按钮组：新建文件夹 + 上传 */
function CreateActionBar({
  newFolderLabel,
  uploadLabel,
  onNewFolder,
  onUpload,
  disabled,
}: {
  newFolderLabel: string;
  uploadLabel: string;
  onNewFolder: () => void;
  onUpload: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        icon={<FolderPlus size={14} />}
        onClick={onNewFolder}
        disabled={disabled}
      >
        {newFolderLabel}
      </Button>
      <Button
        variant="primary"
        size="sm"
        icon={<Upload size={14} />}
        onClick={onUpload}
        disabled={disabled}
      >
        {uploadLabel}
      </Button>
    </div>
  );
}

export function StorageFileGrid({
  entries,
  loading,
  refreshing,
  appUrl,
  currentPath,
  copyUrlLabel,
  copiedLabel,
  deleteLabel,
  refreshLabel,
  newFolderLabel,
  uploadLabel,
  noFilesLabel,
  noFilesHint,
  onNavigate,
  onDelete,
  onRefresh,
  onNewFolder,
  onUpload,
  disabled = false,
}: Props) {
  const showCreateButtons = !!currentPath && !loading;

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-400 text-sm">加载中…</div>
    );
  }

  // 空且有目录路径 → 显示空状态 + 创建按钮
  if (entries.length === 0) {
    return (
      <div className="relative">
        {refreshing && <LoadingSpinner />}
        {showCreateButtons && (
          <div className="mb-4 px-1">
            <CreateActionBar
              newFolderLabel={newFolderLabel}
              uploadLabel={uploadLabel}
              onNewFolder={onNewFolder}
              onUpload={onUpload}
              disabled={disabled}
            />
          </div>
        )}
        <EmptyState
          icon={<Inbox size={48} className="text-zinc-200" />}
          title={noFilesLabel}
          description={noFilesHint}
        />
        {showCreateButtons && (
          <div className="mt-4 px-1">
            <CreateActionBar
              newFolderLabel={newFolderLabel}
              uploadLabel={uploadLabel}
              onNewFolder={onNewFolder}
              onUpload={onUpload}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {refreshing && <LoadingSpinner />}

      {/* 顶部操作栏：创建按钮 + 刷新 */}
      <div className="flex items-center justify-between mb-3">
        {showCreateButtons ? (
          <CreateActionBar
            newFolderLabel={newFolderLabel}
            uploadLabel={uploadLabel}
            onNewFolder={onNewFolder}
            onUpload={onUpload}
            disabled={disabled}
          />
        ) : (
          <div />
        )}
        <Tooltip title={refreshLabel}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={disabled || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshLabel}
          </button>
        </Tooltip>
      </div>

      {/* 文件卡片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {entries.map((entry) => (
          <div
            key={entry.basename}
            onDoubleClick={() => {
              if (entry.isDirectory) {
                const next = currentPath
                  ? `${currentPath}/${entry.filename}`
                  : entry.filename;
                onNavigate(next);
              }
            }}
            className={entry.isDirectory ? 'cursor-pointer' : ''}
          >
            <StorageFileCard
              entry={entry}
              appUrl={appUrl}
              copyUrlLabel={copyUrlLabel}
              copiedLabel={copiedLabel}
              deleteLabel={deleteLabel}
              urlCopied={() => undefined}
              onDelete={onDelete}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {/* 底部创建按钮 */}
      {showCreateButtons && (
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <CreateActionBar
            newFolderLabel={newFolderLabel}
            uploadLabel={uploadLabel}
            onNewFolder={onNewFolder}
            onUpload={onUpload}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// Re-export shared types for parent
export type { DialogKind, DialogTarget };

export default StorageFileGrid;
