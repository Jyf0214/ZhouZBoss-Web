import React from 'react';
import { Select, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';

type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface LoadingConfig {
  type: LoadingType;
  color: string;
  position?: LoadingPosition;
}

interface LoadingAnimationConfigProps {
  title: string;
  config: LoadingConfig;
  onChange: (config: LoadingConfig) => void;
  showPosition?: boolean;
}

const loadingTypeOptions = [
  { value: 'spinner', label: '环形加载 (spinner)' },
  { value: 'antd', label: 'Ant Design 图标 (antd)' },
  { value: 'text', label: '文字动画 (text)' },
  { value: 'dots', label: '三色弹跳 (dots)' },
  { value: 'glow', label: '光晕渐变 (glow)' },
  { value: 'waves', label: '波浪动画 (waves)' },
];

const positionOptions = [
  { value: 'center', label: '居中' },
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-right', label: '右下角' },
];

export default function LoadingAnimationConfig({
  title,
  config,
  onChange,
  showPosition = false,
}: LoadingAnimationConfigProps) {
  return (
    <div className="p-4 bg-zinc-50 rounded-xl">
      <h3 className="text-sm font-bold text-zinc-700 mb-3">{title}</h3>
      <div className={`grid grid-cols-1 ${showPosition ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-500">动画类型</label>
          <Select
            value={config.type}
            onChange={v => onChange({ ...config, type: v })}
            options={loadingTypeOptions}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-2 text-zinc-500">颜色</label>
          <ColorPicker
            value={config.color}
            onChange={(c: Color) => onChange({ ...config, color: c.toHexString() })}
            showText
          />
        </div>
        {showPosition && config.position && (
          <div>
            <label className="block text-xs font-medium mb-2 text-zinc-500">位置</label>
            <Select
              value={config.position}
              onChange={v => onChange({ ...config, position: v })}
              options={positionOptions}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
