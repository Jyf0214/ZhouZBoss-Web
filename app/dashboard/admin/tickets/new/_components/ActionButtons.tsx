'use client';

// 底部操作按钮(取消 / 创建)
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';

interface ActionButtonsProps {
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}

export function ActionButtons({ onCancel, onSubmit, saving }: ActionButtonsProps) {
  const { t } = useI18n();
  return (
    <div className="flex justify-end gap-3">
      <Button onClick={onCancel} variant="default" autoLoading={false}>{t('tickets.cancel')}</Button>
      <Button variant="primary" onClick={onSubmit} loading={saving}>
        {t('tickets.createTemplate')}
      </Button>
    </div>
  );
}
