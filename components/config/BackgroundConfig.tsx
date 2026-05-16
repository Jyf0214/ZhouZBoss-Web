'use client';

import React from 'react';
import { Input, Slider } from 'antd';
import { useI18n } from '@/hooks/use-i18n';

/** 背景配置属性 */
export interface BackgroundConfigProps {
  /** 背景配置 */
  background: {
    url: string;
    opacity: number;
  };
  /** URL 变更回调 */
  onUrlChange: (url: string) => void;
  /** 透明度变更回调 */
  onOpacityChange: (opacity: number) => void;
}

/**
 * 背景配置组件
 * 包含背景URL输入、透明度滑块
 */
export function BackgroundConfig({
  background,
  onUrlChange,
  onOpacityChange,
}: BackgroundConfigProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* 背景 URL 输入 */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('config.backgroundUrl')}</label>
        <Input
          value={background.url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t('config.backgroundUrlPlaceholder')}
        />
        <p className="text-xs text-zinc-400 mt-1">{t('config.backgroundUrlHint')}</p>
      </div>

      {/* 透明度滑块 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('config.overlayOpacity')}: {Math.round(background.opacity * 100)}%
        </label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={background.opacity}
          onChange={onOpacityChange}
          tooltip={{ formatter: (v) => `${Math.round((v || 0) * 100)}%` }}
        />
        <p className="text-xs text-zinc-400 mt-1">{t('config.overlayOpacityHint')}</p>
      </div>
    </div>
  );
}

export default BackgroundConfig;
