'use client';

// 基础信息区块(模板名 / 描述 / 标题格式)
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/hooks/use-i18n';

interface BasicInfoSectionProps {
  nameValue: string;
  onNameChange: (v: string) => void;
  descValue: string;
  onDescChange: (v: string) => void;
  titleFormatValue: string;
  onTitleFormatChange: (v: string) => void;
}

export function BasicInfoSection({
  nameValue, onNameChange,
  descValue, onDescChange,
  titleFormatValue, onTitleFormatChange,
}: BasicInfoSectionProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
      <h2 className="text-base font-bold text-zinc-900 mb-4">{t('tickets.basicInfo')}</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('tickets.templateName')}</label>
        <Input
          type="text"
          value={nameValue}
          onChange={e => onNameChange(e.target.value)}
          placeholder={t('tickets.placeholderName')}
          className="w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('tickets.templateDescription')}</label>
        <Input
          type="text"
          value={descValue}
          onChange={e => onDescChange(e.target.value)}
          placeholder={t('tickets.placeholderDesc')}
          className="w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{t('tickets.titleFormat')}</label>
        <Input
          type="text"
          value={titleFormatValue}
          onChange={e => onTitleFormatChange(e.target.value)}
          placeholder="[Bug] "
          className="w-full"
        />
      </div>
    </div>
  );
}
