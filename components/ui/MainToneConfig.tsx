import React from 'react';
import { Select } from 'antd';
import ToggleField from './ToggleField';

interface MainToneConfigData {
  enable: boolean;
  mode: 'cdn' | 'api' | 'both';
}

interface MainToneConfigProps {
  config: MainToneConfigData;
  onChange: (config: MainToneConfigData) => void;
}

const modeOptions = [
  { value: 'api', label: 'API' },
  { value: 'cdn', label: 'CDN' },
  { value: 'both', label: 'Both（CDN → API）' },
];

export default function MainToneConfig({ config, onChange }: MainToneConfigProps) {
  return (
    <div className="space-y-4">
      <ToggleField
        label="启用主色调"
        description="文章是否启用获取图片主色调"
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />
      <div>
        <label className="block text-sm font-medium mb-2">模式</label>
        <Select
          value={config.mode}
          onChange={v => onChange({ ...config, mode: v })}
          options={modeOptions}
          style={{ width: '100%' }}
          className="!rounded-lg"
        />
        <p className="text-xs text-zinc-400 mt-1">
          CDN 模式为图片 URL + imageAve 参数获取主色调，API 模式为请求 API 获取主色调，Both 模式会先请求 CDN 参数，无法获取时将请求 API
        </p>
      </div>
    </div>
  );
}
