'use client';

import React from 'react';
import { Select } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import { FormField } from '@/components/ui';
import type { SiteConfig } from '@/next.config';

/** 站点配置表单属性 */
export interface SiteConfigFormProps {
  /** 当前站点配置 */
  config: SiteConfig;
  /** 配置变更回调 */
  onChange: (config: SiteConfig) => void;
}

/** 语言选项 */
const languageOptions = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
];

/**
 * 站点配置表单组件
 * 包含标题、描述、英雄标题两行、语言选择
 * 使用 FormField 组件构建
 */
export function SiteConfigForm({ config, onChange }: SiteConfigFormProps) {
  const { t } = useI18n();

  /** 更新单个字段 */
  const updateField = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 标题 */}
      <FormField
        label={t('config.siteTitle')}
        value={config.title}
        onChange={(v) => updateField('title', v)}
      />

      {/* 描述 */}
      <FormField
        label={t('config.siteDescription')}
        value={config.description}
        onChange={(v) => updateField('description', v)}
      />

      {/* 英雄标题第一行 */}
      <FormField
        label={t('config.heroTitle1')}
        value={config.heroTitleLine1}
        onChange={(v) => updateField('heroTitleLine1', v)}
      />

      {/* 英雄标题第二行 */}
      <FormField
        label={t('config.heroTitle2')}
        value={config.heroTitleLine2}
        onChange={(v) => updateField('heroTitleLine2', v)}
      />

      {/* 语言选择 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('config.language')}
          <span className="text-xs text-zinc-400 ml-1">{t('config.languageHint')}</span>
        </label>
        <Select
          value={config.lang}
          onChange={(value) => updateField('lang', value)}
          options={languageOptions}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

export default SiteConfigForm;
