'use client';

import React from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { ToggleField } from '@/components/ui';
import type { AccessConfig } from '@/next.config';

/** 访问控制模块类型 */
export type AccessModule = 'posts' | 'faces' | 'diary';

/** 访问控制面板属性 */
export interface AccessControlPanelProps {
  /** 访问控制配置 */
  accessConfig: AccessConfig;
  /** 配置变更回调 */
  onChange: (config: AccessConfig) => void;
}

/** 访问模块配置项 */
interface AccessModuleItem {
  key: AccessModule;
  labelKey: string;
}

/** 模块配置列表 */
const accessModules: AccessModuleItem[] = [
  { key: 'posts', labelKey: 'config.accessPosts' },
  { key: 'faces', labelKey: 'config.accessFaces' },
  { key: 'diary', labelKey: 'config.accessDiary' },
];

/**
 * 访问控制面板组件
 * 包含 Posts、Faces、Diary 的公开/私有切换
 * 使用 ToggleField 组件
 */
export function AccessControlPanel({ accessConfig, onChange }: AccessControlPanelProps) {
  const { t } = useI18n();

  /** 判断模块是否为公开访问 */
  const isModulePublic = (module: AccessModule): boolean => {
    return accessConfig[module].public.includes('*');
  };

  /** 切换模块访问模式 */
  const toggleModuleAccess = (module: AccessModule, isPublic: boolean) => {
    const newConfig = {
      ...accessConfig,
      [module]: isPublic
        ? { public: ['*'], private: [] }
        : { public: [], private: ['*'] },
    };
    onChange(newConfig);
  };

  return (
    <div className="space-y-3">
      {accessModules.map((module) => {
        const isPublic = isModulePublic(module.key);
        const label = t(module.labelKey);

        return (
          <ToggleField
            key={module.key}
            label={label}
            description={
              isPublic
                ? t('config.accessPublic') || '公开'
                : t('config.accessPrivate') || '私有（默认全部）'
            }
            checked={isPublic}
            onChange={(checked: boolean) => toggleModuleAccess(module.key, checked)}
          />
        );
      })}
    </div>
  );
}

export default AccessControlPanel;
