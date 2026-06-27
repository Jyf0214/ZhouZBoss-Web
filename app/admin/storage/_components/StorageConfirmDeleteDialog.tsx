/**
 * 删除确认对话框(文件/目录通用)
 */
'use client';

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
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled} autoLoading={false}>
          {cancelLabel}
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={disabled}>
          {deleteLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default StorageConfirmDeleteDialog;
