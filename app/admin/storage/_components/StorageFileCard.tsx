/**
 * 单个文件/目录卡片
 *
 * - 缩略图(图片用预览,其它用 lucide 图标)
 * - 文件名 + 大小
 * - 选中时底部显示操作按钮栏(预览/重命名/移动/复制/下载/删除)
 * - 未选中时悬浮显示操作按钮(保持原有交互)
 */
'use client';

import { useState } from 'react';
import { Eye, Copy, Download, FileText, Folder, FolderInput, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { message, Tooltip } from 'antd';
import type { WebDavEntry } from '@/lib/storage/types';
import { formatBytes, formatDate } from '../_lib/format';

interface Props {
  entry: WebDavEntry;
  appUrl: string;
  copyUrlLabel: string;
  copiedLabel: string;
  deleteLabel: string;
  moveLabel: string;
  downloadLabel: string;
  previewLabel?: string;
  renameLabel?: string;
  selected?: boolean;
  onSelect?: (entry: WebDavEntry) => void;
  onFileClick?: (entry: WebDavEntry) => void;
  onNavigate?: (path: string) => void;
  onRename?: (entry: WebDavEntry) => void;
  urlCopied: (filename: string) => void;
  onDelete: (entry: WebDavEntry) => void;
  onMove: (entry: WebDavEntry) => void;
  disabled?: boolean;
}

function mimeMatchesImage(mime: string | null): boolean {
  if (!mime) return false;
  return mime.startsWith('image/');
}

function getFileIcon(mime: string | null, isDirectory: boolean) {
  if (isDirectory) return Folder;
  if (mime?.startsWith('image/')) return ImageIcon;
  return FileText;
}

/** 缩略图/图标区域 */
function CardThumbnail({
  entry,
  publicUrl,
}: {
  entry: Props['entry'];
  publicUrl: string;
}) {
  const Icon = getFileIcon(entry.mimeType, entry.isDirectory);
  const showImage = !entry.isDirectory && mimeMatchesImage(entry.mimeType);
  const [imgError, setImgError] = useState(false);
  return (
    <div className="aspect-square bg-zinc-50 flex items-center justify-center overflow-hidden">
      {showImage && !imgError ? (
        <img src={publicUrl} alt={entry.filename} className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
      ) : (
        <Icon size={entry.isDirectory ? 48 : 40} className={entry.isDirectory ? 'text-amber-500' : 'text-zinc-300'} />
      )}
    </div>
  );
}

const actionBtnClass = 'w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
const actionBtnDangerClass = 'w-8 h-8 rounded-lg bg-white/95 border border-zinc-200 text-red-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

/** 选中状态底部操作按钮栏 */
function SelectedActionBar({
  entry,
  previewLabel,
  renameLabel,
  moveLabel,
  copyUrlLabel,
  downloadLabel,
  deleteLabel,
  disabled,
  onFileClick,
  onNavigate,
  onRename,
  onMove,
  onDelete,
  onCopy,
  onDownload,
}: {
  entry: Props['entry'];
  previewLabel: string;
  renameLabel: string;
  moveLabel: string;
  copyUrlLabel: string;
  downloadLabel: string;
  deleteLabel: string;
  disabled: boolean;
  onFileClick?: Props['onFileClick'];
  onNavigate?: Props['onNavigate'];
  onRename?: Props['onRename'];
  onMove: Props['onMove'];
  onDelete: Props['onDelete'];
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 px-2 py-2 border-t border-zinc-100 bg-zinc-50/80">
      <Tooltip title={entry.isDirectory ? '打开' : previewLabel} placement="top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (entry.isDirectory) onNavigate?.(entry.basename);
            else onFileClick?.(entry);
          }}
          disabled={disabled}
          className={actionBtnClass}
        >
          <Eye size={14} />
        </button>
      </Tooltip>
      {onRename && (
        <Tooltip title={renameLabel} placement="top">
          <button type="button" onClick={(e) => { e.stopPropagation(); onRename(entry); }} disabled={disabled} className={actionBtnClass}>
            <Pencil size={14} />
          </button>
        </Tooltip>
      )}
      <Tooltip title={moveLabel} placement="top">
        <button type="button" onClick={(e) => { e.stopPropagation(); onMove(entry); }} disabled={disabled} className={actionBtnClass}>
          <FolderInput size={14} />
        </button>
      </Tooltip>
      {!entry.isDirectory && (
        <Tooltip title={copyUrlLabel} placement="top">
          <button type="button" onClick={(e) => { e.stopPropagation(); void onCopy(); }} disabled={disabled} className={actionBtnClass}>
            <Copy size={14} />
          </button>
        </Tooltip>
      )}
      {!entry.isDirectory && (
        <Tooltip title={downloadLabel} placement="top">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDownload(); }} disabled={disabled} className={actionBtnClass}>
            <Download size={14} />
          </button>
        </Tooltip>
      )}
      <Tooltip title={deleteLabel} placement="top">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(entry); }} disabled={disabled} className={actionBtnDangerClass}>
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

export function StorageFileCard({
  entry,
  appUrl,
  copyUrlLabel,
  copiedLabel,
  deleteLabel,
  moveLabel,
  downloadLabel,
  previewLabel = '预览',
  renameLabel = '重命名',
  selected = false,
  onSelect,
  onFileClick,
  onNavigate,
  onRename,
  urlCopied,
  onDelete,
  onMove,
  disabled = false,
}: Props) {
  const publicUrl = !entry.isDirectory
    ? `${appUrl.replace(/\/$/, '')}/files/${entry.basename.replace(/^\/+/, '')}`
    : '';

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      message.success(copiedLabel);
      urlCopied(entry.filename);
    } catch {
      message.error('复制失败');
    }
  };

  const handleDownload = () => {
    if (!publicUrl) return;
    const a = document.createElement('a');
    a.href = publicUrl;
    a.download = entry.filename;
    a.click();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) onSelect(entry);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.isDirectory) {
      if (onNavigate) onNavigate(entry.basename);
    } else if (onFileClick) {
      onFileClick(entry);
    }
  };

  return (
    <div
      className={`group relative bg-white border rounded-xl overflow-hidden transition-all cursor-pointer ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
          : 'border-zinc-100 hover:border-zinc-300 hover:shadow-md'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <CardThumbnail entry={entry} publicUrl={publicUrl} />

      {/* 元数据 */}
      <div className="px-3 py-2 border-t border-zinc-50">
        <div className="text-sm font-medium text-zinc-900 truncate" title={entry.filename}>
          {entry.filename}
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center justify-between mt-0.5">
          <span>{entry.isDirectory ? '目录' : formatBytes(entry.size)}</span>
          <span className="truncate ml-2" title={formatDate(entry.lastModified)}>
            {formatDate(entry.lastModified).split(' ')[0]}
          </span>
        </div>
      </div>

      {/* 未选中时: 悬浮操作按钮（保持原有交互） */}
      {!selected && (
        <>
          {!entry.isDirectory && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip title={copyUrlLabel} placement="top">
                <button type="button" onClick={(e) => { e.stopPropagation(); void handleCopy(); }} disabled={disabled} className={actionBtnClass}>
                  <Copy size={14} />
                </button>
              </Tooltip>
              <Tooltip title={downloadLabel} placement="top">
                <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(); }} disabled={disabled} className={actionBtnClass}>
                  <Download size={14} />
                </button>
              </Tooltip>
              <Tooltip title={moveLabel} placement="top">
                <button type="button" onClick={(e) => { e.stopPropagation(); onMove(entry); }} disabled={disabled} className={actionBtnClass}>
                  <FolderInput size={14} />
                </button>
              </Tooltip>
              <Tooltip title={deleteLabel} placement="top">
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(entry); }} disabled={disabled} className={actionBtnDangerClass}>
                  <Trash2 size={14} />
                </button>
              </Tooltip>
            </div>
          )}
          {entry.isDirectory && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip title={moveLabel} placement="top">
                <button type="button" onClick={(e) => { e.stopPropagation(); onMove(entry); }} disabled={disabled} className={actionBtnClass}>
                  <FolderInput size={14} />
                </button>
              </Tooltip>
              <Tooltip title={deleteLabel} placement="top">
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(entry); }} disabled={disabled} className={actionBtnDangerClass}>
                  <Trash2 size={14} />
                </button>
              </Tooltip>
            </div>
          )}
        </>
      )}

      {/* 选中时: 底部操作按钮栏 */}
      {selected && (
        <SelectedActionBar
          entry={entry}
          previewLabel={previewLabel}
          renameLabel={renameLabel}
          moveLabel={moveLabel}
          copyUrlLabel={copyUrlLabel}
          downloadLabel={downloadLabel}
          deleteLabel={deleteLabel}
          disabled={disabled}
          onFileClick={onFileClick}
          onNavigate={onNavigate}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

export default StorageFileCard;
