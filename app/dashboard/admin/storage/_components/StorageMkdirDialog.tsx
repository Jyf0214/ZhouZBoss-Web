/**
 * 新建文件夹对话框
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Modal } from 'antd';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  open: boolean;
  currentPath: string;
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  createLabel: string;
  cancelLabel: string;
  rootLabel: string;
  onCancel: () => void;
  onCreate: (name: string) => void;
  disabled?: boolean;
}

export function StorageMkdirDialog({
  open,
  currentPath,
  title,
  nameLabel,
  namePlaceholder,
  createLabel,
  cancelLabel,
  rootLabel,
  onCancel,
  onCreate,
  disabled = false,
}: Props) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled || submitting) return;
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim());
      setName('');
    } catch {
      // 失败时保留输入内容，用户可修改后重试
    } finally {
      setSubmitting(false);
    }
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
      width="min(400px, 95vw)"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3 text-xs text-zinc-500">
          父级目录:<span className="font-mono text-zinc-700 ml-1">{targetPath}</span>
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
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting} autoLoading={false}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            autoLoading={false}
            disabled={disabled || !name.trim() || submitting}
            loading={submitting}
          >
            {createLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default StorageMkdirDialog;
