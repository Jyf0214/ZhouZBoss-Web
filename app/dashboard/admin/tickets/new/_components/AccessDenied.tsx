'use client';

// 权限拒绝提示(非 sudo/admin 角色)
import { useI18n } from '@/hooks/use-i18n';

export function AccessDenied() {
  const { t } = useI18n();
  return (
    <div className="p-8 text-center text-red-500">{t('tickets.accessDenied')}</div>
  );
}
