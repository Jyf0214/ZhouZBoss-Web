'use client';

import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Popconfirm } from 'antd';

import { Button } from '@/components/ui/Button';

/** 表单底部操作按钮(返回 / 删除 / 保存) */
export function EditFaceFormActions({
  fullPath,
  submitting,
  deleting,
  onDelete,
  t,
}: {
  fullPath: string;
  submitting: boolean;
  deleting: boolean;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
      <Link href={`/faces${fullPath}`}>
        <Button
          variant="default"
          icon={<ArrowLeft size={16} />}
          autoLoading={false}
          className="h-10 px-6 rounded-xl"
        >
          {t('common.back')}
        </Button>
      </Link>

      <div className="flex gap-3">
        <Popconfirm
          title={t('common.confirm')}
          description={t('faces.deleteConfirm')}
          onConfirm={onDelete}
          okText={t('common.confirm')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            loading={deleting}
            className="h-10 px-6 rounded-xl"
          >
            {t('common.delete')}
          </Button>
        </Popconfirm>

        <Button
          variant="primary"
          size="lg"
          rounded="md"
          type="submit"
          icon={<Save size={16} />}
          loading={submitting}
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
