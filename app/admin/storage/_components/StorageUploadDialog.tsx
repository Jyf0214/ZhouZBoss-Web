/**
 * 上传对话框 — 拖拽 / 选择文件
 *
 * - 客户端预校验 50MB 上限
 * - 通过回调 onUpload(files) 触发实际上传
 * - 全部成功 / 失败由 use-storage-state 统一发消息
 */
'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Modal, message } from 'antd';
import { Upload, X, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface Props {
  open: boolean;
  currentPath: string;
  uploadLabel: string;
  cancelLabel: string;
  fileTooLargeLabel: string;
  emptyHint: string;
  rootLabel: string;
  onCancel: () => void;
  onUpload: (files: File[]) => Promise<void> | void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StorageUploadDialog({
  open,
  currentPath,
  uploadLabel,
  cancelLabel,
  fileTooLargeLabel,
  emptyHint,
  rootLabel,
  onCancel,
  onUpload,
  disabled = false,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleAdd = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => [...prev, ...arr]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleAdd(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) handleAdd(e.dataTransfer.files);
  };

  const handleRemove = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (disabled || uploading) return;
    if (files.length === 0) return;
    const oversize = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversize) {
      message.warning(`${fileTooLargeLabel}: ${oversize.name}`);
      return;
    }
    setUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
    } catch {
      // 失败时保留文件列表，用户可重试
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setDragging(false);
    onCancel();
  };

  const targetPath = currentPath || rootLabel;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={uploadLabel}
      destroyOnClose
      maskClosable={!disabled}
      width="min(520px, 92vw)"
    >
      <div className="mb-3 text-xs text-zinc-500">
        上传到 <span className="font-mono text-zinc-700">{targetPath}</span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl py-10 px-4 text-center transition-colors cursor-pointer',
          dragging ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400',
          disabled && 'opacity-40 cursor-not-allowed',
        ].join(' ')}
      >
        <Upload size={32} className="mx-auto text-zinc-300 mb-2" />
        <p className="text-sm text-zinc-500">
          拖拽文件到此处,或
          <span className="text-zinc-900 font-medium ml-1">点击选择</span>
        </p>
        <p className="text-xs text-zinc-400 mt-1">单个文件最大 50MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
          {files.map((f, idx) => {
            const tooBig = f.size > MAX_FILE_SIZE;
            return (
              <li
                key={`${idx}-${f.name}`}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  tooBig ? 'bg-red-50 text-red-700' : 'bg-zinc-50 text-zinc-700',
                ].join(' ')}
              >
                <FileIcon size={14} className="shrink-0" />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-xs text-zinc-400 shrink-0">
                  {formatBytes(f.size)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(idx);
                  }}
                  className="text-zinc-400 hover:text-zinc-900"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {files.length === 0 && (
        <p className="mt-4 text-center text-xs text-zinc-400">{emptyHint}</p>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" size="sm" onClick={handleClose} disabled={uploading} autoLoading={false}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || files.length === 0 || uploading}
          loading={uploading}
        >
          {uploading ? '上传中...' : uploadLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default StorageUploadDialog;
