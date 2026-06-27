/**
 * 重命名文件夹对话框
 *
 * - 复用 StorageMkdirDialog 的布局模式
 * - 预填当前文件夹名
 * - 校验:非空、不含斜杠、名称变化
 */
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from 'antd';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  open: boolean;
  currentPath: string;
  currentName: string;
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  createLabel: string;
  cancelLabel: string;
  rootLabel: string;
  onCancel: () => void;
  onRename: (newName: string) => void;
  disabled?: boolean;
}

export function StorageRenameDialog({
  open,
  currentPath,
  currentName,
  title,
  nameLabel,
  namePlaceholder,
  createLabel,
  cancelLabel,
  rootLabel,
  onCancel,
  onRename,
  disabled = false,
}: Props) {
  const [name, setName] = useState('');

  // 打开时预填当前名称
  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const trimmed = name.trim();
  const canSubmit = !disabled && trimmed.length > 0 && trimmed !== currentName;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onRename(trimmed);
  };

  const handleClose = () => {
    setName('');
    onCancel();
  };

  const targetPath = currentPath || rootLabel;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={title}
      destroyOnClose
      width="min(440px, 90vw)"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3 text-xs text-zinc-500">
          当前路径:<span className="font-mono text-zinc-700 ml-1">{targetPath}</span>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">{nameLabel}</span>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
            disabled={disabled}
            autoFocus
            className="mt-1"
          />
        </label>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={disabled} autoLoading={false}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            autoLoading={false}
            disabled={!canSubmit}
          >
            {createLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default StorageRenameDialog;
