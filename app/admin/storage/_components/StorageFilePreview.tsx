/**
 * 文件预览弹窗
 *
 * - 图片:直接渲染预览
 * - 文本类:显示文件信息
 * - 其它:显示图标 + 信息
 * - 支持下载、复制 URL
 */
'use client';

import { Modal, message } from 'antd';
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import type { WebDavEntry } from '@/lib/storage/types';
import { formatBytes, formatDate } from '../_lib/format';

interface Props {
  open: boolean;
  entry: WebDavEntry | null;
  appUrl: string;
  onClose: () => void;
}

function getFileCategory(mime: string | null): string {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'archive';
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript')) return 'text';
  return 'file';
}

function getCategoryIcon(mime: string | null) {
  const cat = getFileCategory(mime);
  switch (cat) {
    case 'image': return ImageIcon;
    case 'video': return Film;
    case 'audio': return Music;
    case 'archive': return Archive;
    case 'text': return FileText;
    default: return File;
  }
}

function getCategoryLabel(mime: string | null): string {
  const cat = getFileCategory(mime);
  switch (cat) {
    case 'image': return '图片';
    case 'video': return '视频';
    case 'audio': return '音频';
    case 'archive': return '压缩包';
    case 'text': return '文本';
    default: return '文件';
  }
}

export function StorageFilePreview({ open, entry, appUrl, onClose }: Props) {
  if (!entry) return null;

  const publicUrl = `${appUrl.replace(/\/$/, '')}/files/${entry.basename.replace(/^\/+/, '')}`;
  const isImage = entry.mimeType?.startsWith('image/') ?? false;
  const Icon = getCategoryIcon(entry.mimeType);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      message.success('URL 已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = publicUrl;
    a.download = entry.filename;
    a.click();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={isImage ? 640 : 480}
      destroyOnClose
    >
      {/* 图片预览 */}
      {isImage && (
        <div className="mb-4 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center">
          <img
            src={publicUrl}
            alt={entry.filename}
            className="max-w-full max-h-[60vh] object-contain"
          />
        </div>
      )}

      {/* 非图片:图标 + 类型标签 */}
      {!isImage && (
        <div className="flex items-center gap-4 mb-4 p-4 rounded-lg bg-zinc-50">
          <div className="w-14 h-14 rounded-xl bg-white border border-zinc-100 flex items-center justify-center">
            <Icon size={28} className="text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-900 truncate">{entry.filename}</div>
            <Tag size="sm" variant="light" className="mt-1">{getCategoryLabel(entry.mimeType)}</Tag>
          </div>
        </div>
      )}

      {/* 文件信息 */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">文件名</span>
          <span className="text-zinc-900 font-mono truncate ml-4">{entry.filename}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">大小</span>
          <span className="text-zinc-900">{formatBytes(entry.size)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">类型</span>
          <span className="text-zinc-900">{entry.mimeType ?? '未知'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">修改时间</span>
          <span className="text-zinc-900">{formatDate(entry.lastModified)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">路径</span>
          <span className="text-zinc-900 font-mono text-xs truncate ml-4 max-w-[280px]">{entry.basename}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={handleCopy}>
          复制 URL
        </Button>
        <Button variant="default" size="sm" icon={<ExternalLink size={14} />} onClick={() => window.open(publicUrl, '_blank')}>
          新窗口打开
        </Button>
        <Button variant="primary" size="sm" icon={<Download size={14} />} onClick={handleDownload}>
          下载
        </Button>
      </div>
    </Modal>
  );
}

export default StorageFilePreview;
