/**
 * 右侧文件网格 — 列出当前路径条目,网格布局
 *
 * - 空时展示 EmptyState
 * - 单个目录/文件用 StorageFileCard 渲染
 * - 双击文件名 = 进入目录 / 复制 URL
 * - 点击文件 → 预览弹窗
 * - 搜索过滤:按名称实时过滤
 * - 排序控件:名称/大小/日期
 * - 拖拽上传:拖文件到网格区域上传
 * - 刷新时容器内局部加载，不替换整个页面
 * - 文件夹内顶部/底部显示快捷创建按钮
 */
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, FolderPlus, Inbox, RefreshCw, Upload, X } from 'lucide-react';
import { Tooltip } from 'antd';
import type { WebDavEntry } from '@/lib/storage/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { StorageFileCard } from './StorageFileCard';
import type { DialogKind, DialogTarget } from '../_lib/types';
import type { SortField, SortDirection } from '../_lib/use-storage-state';

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
  searchPlaceholder: string;
  noResultsLabel: string;
  dragHereLabel: string;
  moveLabel: string;
  onDropUpload?: (files: File[]) => void;
  onMove: (entry: WebDavEntry) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onNavigate: (path: string) => void;
  onDelete: (entry: WebDavEntry) => void;
  onFileClick: (entry: WebDavEntry) => void;
  onRename?: (entry: WebDavEntry) => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onToggleSort: (field: SortField) => void;
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
        autoLoading={false}
      >
        {newFolderLabel}
      </Button>
      <Button
        variant="primary"
        size="sm"
        icon={<Upload size={14} />}
        onClick={onUpload}
        disabled={disabled}
        autoLoading={false}
      >
        {uploadLabel}
      </Button>
    </div>
  );
}

/** 排序按钮 */
function SortButton({
  field,
  label,
  currentField,
  currentDirection,
  onToggle,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDirection: SortDirection;
  onToggle: (field: SortField) => void;
}) {
  const active = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={[
        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
        active
          ? 'bg-zinc-200 text-zinc-900 font-medium'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
      ].join(' ')}
    >
      {label}
      {active ? (
        currentDirection === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
      ) : (
        <ArrowUpDown size={10} className="opacity-40" />
      )}
    </button>
  );
}

/** 对 entries 按 sortField + sortDirection 排序(目录始终排在前面) */
function sortEntries(entries: WebDavEntry[], field: SortField, dir: SortDirection): WebDavEntry[] {
  const sorted = [...entries].sort((a, b) => {
    // 目录始终优先
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let cmp = 0;
    if (field === 'name') cmp = a.filename.localeCompare(b.filename, 'zh');
    else if (field === 'size') cmp = a.size - b.size;
    else cmp = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();

    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/** 空目录状态 */
function EmptyDirectoryView({
  refreshing,
  showCreateButtons,
  newFolderLabel,
  uploadLabel,
  noFilesLabel,
  noFilesHint,
  onNewFolder,
  onUpload,
  disabled,
}: {
  refreshing: boolean;
  showCreateButtons: boolean;
  newFolderLabel: string;
  uploadLabel: string;
  noFilesLabel: string;
  noFilesHint: string;
  onNewFolder: () => void;
  onUpload: () => void;
  disabled: boolean;
}) {
  return (
    <div className="relative">
      {refreshing && <LoadingSpinner />}
      {showCreateButtons && (
        <div className="mb-4 px-1">
          <CreateActionBar newFolderLabel={newFolderLabel} uploadLabel={uploadLabel} onNewFolder={onNewFolder} onUpload={onUpload} disabled={disabled} />
        </div>
      )}
      <EmptyState
        icon={<Inbox size={48} className="text-zinc-200" />}
        title={noFilesLabel}
        description={noFilesHint}
      />
      {showCreateButtons && (
        <div className="mt-4 px-1">
          <CreateActionBar newFolderLabel={newFolderLabel} uploadLabel={uploadLabel} onNewFolder={onNewFolder} onUpload={onUpload} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

/** 搜索 + 排序 + 刷新工具栏 */
function SortToolbar({
  entries,
  search,
  onSearchChange,
  searchPlaceholder,
  refreshLabel,
  sortField,
  sortDirection,
  onToggleSort,
  onRefresh,
  refreshing,
  disabled,
}: {
  entries: WebDavEntry[];
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  refreshLabel: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onToggleSort: (field: SortField) => void;
  onRefresh: () => void;
  refreshing: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {entries.length > 0 && (
        <div className="relative mr-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-32 h-7 pl-7 pr-6 rounded-lg border border-zinc-200 text-xs bg-white focus:border-zinc-400 focus:outline-none transition-colors"
          />
          {search && (
            <button type="button" onClick={() => onSearchChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={12} />
            </button>
          )}
        </div>
      )}
      <SortButton field="name" label="名称" currentField={sortField} currentDirection={sortDirection} onToggle={onToggleSort} />
      <SortButton field="size" label="大小" currentField={sortField} currentDirection={sortDirection} onToggle={onToggleSort} />
      <SortButton field="date" label="日期" currentField={sortField} currentDirection={sortDirection} onToggle={onToggleSort} />
      <div className="w-px h-3 bg-zinc-200 mx-1" />
      <Tooltip title={refreshLabel}>
        <button type="button" onClick={onRefresh} disabled={disabled || refreshing} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshLabel}
        </button>
      </Tooltip>
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
  searchPlaceholder,
  noResultsLabel,
  dragHereLabel,
  moveLabel,
  onDropUpload,
  onMove,
  sortField,
  sortDirection,
  onNavigate,
  onDelete,
  onFileClick,
  onRename,
  onRefresh,
  onNewFolder,
  onUpload,
  onToggleSort,
  disabled = false,
}: Props) {
  const showCreateButtons = !!currentPath && !loading;
  const [search, setSearch] = useState('');
  const trimmedSearch = search.trim().toLowerCase();
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const [selectedEntry, setSelectedEntry] = useState<WebDavEntry | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    if (!onDropUpload || disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onDropUpload(files);
  }, [onDropUpload, disabled]);

  const filteredEntries = useMemo(() => {
    const sorted = sortEntries(entries, sortField, sortDirection);
    if (!trimmedSearch) return sorted;
    return sorted.filter((e) => e.filename.toLowerCase().includes(trimmedSearch));
  }, [entries, sortField, sortDirection, trimmedSearch]);

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-400 text-sm">加载中…</div>
    );
  }

  // 空且有目录路径 → 显示空状态 + 创建按钮
  if (entries.length === 0) {
    return (
      <EmptyDirectoryView
        refreshing={refreshing}
        showCreateButtons={showCreateButtons}
        newFolderLabel={newFolderLabel}
        uploadLabel={uploadLabel}
        noFilesLabel={noFilesLabel}
        noFilesHint={noFilesHint}
        onNewFolder={onNewFolder}
        onUpload={onUpload}
        disabled={disabled}
      />
    );
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => setSelectedEntry(null)}
    >
      {refreshing && <LoadingSpinner />}

      {/* 拖拽上传覆盖层 */}
      {dragging && onDropUpload && (
        <div className="absolute inset-0 bg-blue-50/90 border-2 border-dashed border-blue-300 rounded-lg z-20 flex flex-col items-center justify-center pointer-events-none">
          <Upload size={32} className="text-blue-400 mb-2" />
          <span className="text-sm font-medium text-blue-600">{dragHereLabel}</span>
        </div>
      )}

      {/* 顶部操作栏：创建按钮 + 排序 + 刷新 */}
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
        <SortToolbar
          entries={entries}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={searchPlaceholder}
          refreshLabel={refreshLabel}
          sortField={sortField}
          sortDirection={sortDirection}
          onToggleSort={onToggleSort}
          onRefresh={onRefresh}
          refreshing={refreshing}
          disabled={disabled}
        />
      </div>

      {/* 搜索无结果 */}
      {trimmedSearch && filteredEntries.length === 0 && (
        <div className="py-12 text-center text-zinc-400 text-sm">{noResultsLabel}</div>
      )}

      {/* 文件卡片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {filteredEntries.map((entry) => (
          <StorageFileCard
            key={entry.basename}
            entry={entry}
            appUrl={appUrl}
            copyUrlLabel={copyUrlLabel}
            copiedLabel={copiedLabel}
            deleteLabel={deleteLabel}
            moveLabel={moveLabel}
            downloadLabel="下载"
            previewLabel="预览"
            renameLabel="重命名"
            selected={selectedEntry?.basename === entry.basename}
            onSelect={setSelectedEntry}
            onFileClick={onFileClick}
            onNavigate={onNavigate}
            onRename={onRename}
            urlCopied={() => undefined}
            onDelete={onDelete}
            onMove={onMove}
            disabled={disabled}
          />
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
