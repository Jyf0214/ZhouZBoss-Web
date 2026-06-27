'use client';

// 表单字段区块(列表 + 添加按钮)
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { FieldRow } from './FieldRow';
import type { TicketFieldDef } from '../_lib/types';

interface FormFieldsSectionProps {
  fields: TicketFieldDef[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, key: string, value: string | boolean | string[]) => void;
}

export function FormFieldsSection({
  fields, onAdd, onRemove, onUpdate,
}: FormFieldsSectionProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
      <h2 className="text-base font-bold text-zinc-900 mb-4">{t('tickets.formFields')}</h2>
      {fields.map((field, index) => (
        <FieldRow
          key={index}
          field={field}
          index={index}
          removable={fields.length > 1}
          onRemove={onRemove}
          onUpdate={onUpdate}
        />
      ))}
      <Button onClick={onAdd} icon={<Plus size={14} />} variant="primary" size="sm" autoLoading={false}>
        {t('tickets.addField')}
      </Button>
    </div>
  );
}
