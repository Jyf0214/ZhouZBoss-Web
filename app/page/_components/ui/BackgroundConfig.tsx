import React from 'react';
import { Slider } from 'antd';
import FormField from './FormField';

interface BackgroundConfigData {
  url: string;
  opacity: number;
}

interface BackgroundConfigProps {
  config: BackgroundConfigData;
  onChange: (config: BackgroundConfigData) => void;
  urlLabel: string;
  opacityLabel: string;
}

export default function BackgroundConfig({
  config,
  onChange,
  urlLabel,
  opacityLabel,
}: BackgroundConfigProps) {
  return (
    <>
      <div className="mb-4">
        <FormField
          label={urlLabel}
          value={config.url}
          onChange={v => onChange({ ...config, url: v })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          {opacityLabel}: {Math.round(config.opacity * 100)}%
        </label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={config.opacity}
          onChange={value => onChange({ ...config, opacity: value })}
          tooltip={{ formatter: (v) => `${Math.round((v ?? 0) * 100)}%` }}
        />
      </div>
    </>
  );
}
