import React from 'react';
import { Select } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import FormField from './FormField';

interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

interface SiteConfigFormProps {
  config: SiteConfig;
  onChange: (config: SiteConfig) => void;
}

export default function SiteConfigForm({ config, onChange }: SiteConfigFormProps) {
  const { t } = useI18n();

  const updateField = (field: keyof SiteConfig, value: string) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        label={t('config.siteTitle')}
        value={config.title}
        onChange={v => updateField('title', v)}
      />
      <FormField
        label={t('config.siteDescription')}
        value={config.description}
        onChange={v => updateField('description', v)}
      />
      <FormField
        label={t('config.heroTitle1')}
        value={config.heroTitleLine1}
        onChange={v => updateField('heroTitleLine1', v)}
      />
      <FormField
        label={t('config.heroTitle2')}
        value={config.heroTitleLine2}
        onChange={v => updateField('heroTitleLine2', v)}
      />
      <div>
        <label className="block text-sm font-medium mb-2">{t('config.language')}</label>
        <Select
          value={config.lang}
          onChange={value => updateField('lang', value)}
          options={[
            { value: 'zh-CN', label: '中文' },
            { value: 'en-US', label: 'English' },
            { value: 'ja-JP', label: '日本語' },
          ]}
          style={{ width: '100%' }}
          placement="bottomLeft"
        />
      </div>
    </div>
  );
}
