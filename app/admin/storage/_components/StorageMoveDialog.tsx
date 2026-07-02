/**
 * 移动文件/文件夹对话框
 *
 * - 显示文件夹树供选择目标
 * - 高亮当前所在目录(不可选)
 * - 选中后确认移动
 */
'use client';

import { useState } from 'react';
import { Modal } from 'antd';
import { Folder, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { StorageFolderMeta } from '@/lib/storage/types';

interface Props {
  open: boolean;
  currentPath: string;
  folders: StorageFolderMeta[];
  title: string;
  selectFolderLabel: string;
  createLabel: string;
  cancelLabel: string;
  rootLabel: string;
  onCancel: () => void;
  onMove: (destination: string) => void;
  disabled?: boolean;
}

export function StorageMoveDialog({
  open,
  currentPath,
  folders,
  title,
  selectFolderLabel,
  createLabel,
  cancelLabel,
  rootLabel,
  onCancel,
  onMove,
  disabled = false,
}: Props) {
  // 提取当前文件所在目录(排除文件本身)
  const currentDir = currentPath.includes('/')
    ? currentPath.split('/').slice(0, -1).join('/')
    : '';

  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleMove = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    try {
      await onMove(selected);
    } catch {
      // 失败时保持对话框打开
    } finally {
      setSubmitting(false);
    }
  };

  // 过滤掉当前文件所在的目录(不能移到自身)
  const availableFolders = folders.filter((f) => {
    // 不能移动到自身所在目录
    if (f.path === currentDir) return false;
    // 不能移动到自身(如果自身是文件夹)
    if (f.path === currentPath) return false;
    return true;
  });

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={title}
      destroyOnClose
      width="min(400px, 90vw)"
    >
      <div className="text-sm text-zinc-500 mb-3">{selectFolderLabel}</div>

      {/* 根目录选项 */}
      <button
        type="button"
        onClick={() => setSelected('')}
        className={[
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
          selected === ''
            ? 'bg-zinc-100 text-zinc-900 font-semibold'
            : 'text-zinc-700 hover:bg-zinc-50',
        ].join(' ')}
      >
        <Folder size={14} className="text-amber-500" />
        <span className="flex-1 text-left">{rootLabel}</span>
        {selected === '' && <ChevronRight size={12} className="text-zinc-400" />}
      </button>

      {/* 文件夹列表 */}
      <div className="max-h-[300px] overflow-y-auto space-y-0.5">
        {availableFolders.map((folder) => (
          <button
            key={folder.path}
            type="button"
            onClick={() => setSelected(folder.path)}
            className={[
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              selected === folder.path
                ? 'bg-zinc-100 text-zinc-900 font-semibold'
                : 'text-zinc-700 hover:bg-zinc-50',
            ].join(' ')}
          >
            <Folder size={14} className="text-amber-500" />
            <span className="flex-1 text-left truncate">{folder.path}</span>
            {selected === folder.path && <ChevronRight size={12} className="text-zinc-400" />}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting} autoLoading={false}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleMove}
          disabled={disabled || selected === null || submitting}
          loading={submitting}
        >
          {createLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default StorageMoveDialog;
