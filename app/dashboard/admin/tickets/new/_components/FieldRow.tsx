'use client';

// 单个表单字段行(用于 FormFieldsSection 内)
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { FIELD_TYPES } from '../_lib/field-types';
import type { TicketFieldDef } from '../_lib/types';

interface FieldRowProps {
  field: TicketFieldDef;
  index: number;
  removable: boolean;
  onUpdate: (index: number, key: string, value: string | boolean | string[]) => void;
  onRemove: (index: number) => void;
}

export function FieldRow({ field, index, removable, onUpdate, onRemove }: FieldRowProps) {
  const { t } = useI18n();
  const showOptions = field.type === 'dropdown' || field.type === 'checkboxes';
  return (
    <div className="mb-4 p-4 bg-zinc-50 rounded-xl">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium">{t('tickets.fieldName')} {index + 1}</span>
        {removable && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={<Trash2 size={16} />}
            className="text-red-500"
            onClick={() => onRemove(index)}
            autoLoading={false}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs mb-1">{t('tickets.fieldName')}</label>
          <Input
            type="text"
            size="sm"
            value={field.name}
            onChange={e => onUpdate(index, 'name', e.target.value)}
            placeholder="environment"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">{t('tickets.inputLabel')}</label>
          <Input
            type="text"
            size="sm"
            value={field.label}
            onChange={e => onUpdate(index, 'label', e.target.value)}
            placeholder="环境"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs mb-1">{t('tickets.fieldType')}</label>
          <Select
            value={field.type}
            onChange={e => onUpdate(index, 'type', e.target.value)}
            size="sm"
          >
            {FIELD_TYPES.map(ft => (
              <option key={ft.value} value={ft.value}>{t(ft.labelKey)}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => onUpdate(index, 'required', e.target.checked)}
            />
            {t('tickets.required')}
          </label>
        </div>
      </div>
      {showOptions && (
        <div>
          <label className="block text-xs mb-1">{t('tickets.options')}</label>
          <textarea
            value={field.options.join('\n')}
            onChange={e => onUpdate(index, 'options', e.target.value.split('\n').filter(Boolean))}
            className="w-full min-h-[60px] p-2 border border-zinc-200 rounded-lg text-sm"
            placeholder={t('tickets.placeholderOptions')}
          />
        </div>
      )}
    </div>
  );
}
