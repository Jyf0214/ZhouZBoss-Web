'use client';

import React from 'react';
import { Select, ColorPicker } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import type { Color } from 'antd/es/color-picker';

/** 加载动画类型 */
export type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';

/** 加载动画位置 */
export type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** 轻加载配置 */
export interface PageLoadingConfig {
  type: LoadingType;
  color: string;
  position: LoadingPosition;
}

/** 重加载配置 */
export interface NavigationLoadingConfig {
  type: LoadingType;
  color: string;
}

/** 加载动画配置属性 */
export interface LoadingAnimationConfigProps {
  /** 轻加载配置 */
  pageConfig: PageLoadingConfig;
  /** 重加载配置 */
  navigationConfig: NavigationLoadingConfig;
  /** 轻加载类型变更回调 */
  onPageTypeChange: (type: LoadingType) => void;
  /** 轻加载颜色变更回调 */
  onPageColorChange: (color: Color) => void;
  /** 轻加载位置变更回调 */
  onPagePositionChange: (position: LoadingPosition) => void;
  /** 重加载类型变更回调 */
  onNavigationTypeChange: (type: LoadingType) => void;
  /** 重加载颜色变更回调 */
  onNavigationColorChange: (color: Color) => void;
}

/** 动画类型选项 */
const loadingTypeOptions = [
  { value: 'spinner', label: '环形加载 (spinner)' },
  { value: 'antd', label: 'Ant Design 图标 (antd)' },
  { value: 'text', label: '文字动画 (text)' },
  { value: 'dots', label: '三色弹跳 (dots)' },
  { value: 'glow', label: '光晕渐变 (glow)' },
  { value: 'waves', label: '波浪动画 (waves)' },
];

/** 位置选项 */
const positionOptions = [
  { value: 'center', label: '居中' },
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-right', label: '右下角' },
];

/**
 * 加载动画配置组件
 * 包含轻加载设置（类型、颜色、位置）和重加载设置（类型、颜色）
 * 使用 Select、ColorPicker 组件
 */
export function LoadingAnimationConfig({
  pageConfig,
  navigationConfig,
  onPageTypeChange,
  onPageColorChange,
  onPagePositionChange,
  onNavigationTypeChange,
  onNavigationColorChange,
}: LoadingAnimationConfigProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* 轻加载设置 */}
      <div className="p-4 bg-zinc-50 rounded-xl">
        <h3 className="text-sm font-bold text-zinc-700 mb-3">
          {t('loadingPreview.category') || '轻加载（页面内数据加载）'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 动画类型 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.select') || '动画类型'}
            </label>
            <Select
              value={pageConfig.type}
              onChange={onPageTypeChange}
              options={loadingTypeOptions}
              style={{ width: '100%' }}
            />
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.color') || '颜色'}
            </label>
            <ColorPicker
              value={pageConfig.color}
              onChange={onPageColorChange}
              showText
            />
          </div>

          {/* 位置选择 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.position') || '加载位置'}
            </label>
            <Select
              value={pageConfig.position}
              onChange={onPagePositionChange}
              options={positionOptions}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* 重加载设置 */}
      <div className="p-4 bg-zinc-50 rounded-xl">
        <h3 className="text-sm font-bold text-zinc-700 mb-3">
          {t('loadingPreview.demo') || '重加载（路由导航/F5刷新）'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 动画类型 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.select') || '动画类型'}
            </label>
            <Select
              value={navigationConfig.type}
              onChange={onNavigationTypeChange}
              options={loadingTypeOptions}
              style={{ width: '100%' }}
            />
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">
              {t('loadingPreview.color') || '颜色'}
            </label>
            <ColorPicker
              value={navigationConfig.color}
              onChange={onNavigationColorChange}
              showText
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingAnimationConfig;
