'use client';

// 页面顶部标题区
import { Plus } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

export function PageHeader() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
        <Plus size={18} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('tickets.newTemplate')}</h1>
        <p className="text-sm text-zinc-400">{t('tickets.customTemplateDesc')}</p>
      </div>
    </div>
  );
}
