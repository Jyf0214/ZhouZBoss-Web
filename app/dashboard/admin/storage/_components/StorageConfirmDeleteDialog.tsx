/**
 * 删除确认对话框(文件/目录通用)
 */
'use client';

import { useState, useCallback } from 'react';
import { Modal } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  target: string | null;
  isFolder: boolean;
  titleLabel: string;
  folderTitleLabel: string;
  descLabel: string;
  cancelLabel: string;
  deleteLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function StorageConfirmDeleteDialog({
  open,
  target,
  isFolder,
  titleLabel,
  folderTitleLabel,
  descLabel,
  cancelLabel,
  deleteLabel,
  onCancel,
  onConfirm,
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      setLoading(false);
    }
  }, [onConfirm]);
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={isFolder ? folderTitleLabel : titleLabel}
      destroyOnClose
      width="min(420px, 90vw)"
    >
      <div className="flex items-start gap-3 py-2">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-700">
            {descLabel}
            {target ? (
              <>
                : <span className="font-mono text-zinc-900 break-all">{target}</span>
              </>
            ) : null}
          </p>
          {isFolder && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs leading-relaxed">
              <strong>警告：</strong> 删除文件夹将同时删除其内部的所有子文件和子文件夹，此操作不可逆，请谨慎操作。
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled || loading} autoLoading={false}>
          {cancelLabel}
        </Button>
        <Button variant="danger" size="sm" onClick={handleConfirm} disabled={disabled || loading} loading={loading}>
          {deleteLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default StorageConfirmDeleteDialog;
