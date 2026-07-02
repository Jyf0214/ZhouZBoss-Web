import React from 'react';
import { InputNumber } from 'antd';
import ToggleField from './ToggleField';

interface CopyConfigData {
  enable: boolean;
  copyright: {
    enable: boolean;
    limitCount: number;
  };
}

interface CopyConfigProps {
  config: CopyConfigData;
  onChange: (config: CopyConfigData) => void;
}

export default function CopyConfig({ config, onChange }: CopyConfigProps) {
  return (
    <div className="space-y-4">
      <ToggleField
        label="复制弹窗提示"
        description="复制内容后弹出版权提示"
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <div className="pl-4 border-l-2 border-zinc-100 space-y-4">
        <ToggleField
          label="追加版权信息"
          description="复制的内容末尾自动追加版权声明"
          checked={config.copyright.enable}
          onChange={v => onChange({ ...config, copyright: { ...config.copyright, enable: v } })}
        />

        <div>
          <label className="block text-sm font-medium mb-2">触发字数下限</label>
          <InputNumber
            value={config.copyright.limitCount}
            onChange={v => onChange({ ...config, copyright: { ...config.copyright, limitCount: v ?? 50 } })}
            min={0}
            max={9999}
            className="!w-full !rounded-lg"
          />
          <p className="text-xs text-zinc-400 mt-1">复制内容超过此字数时追加版权信息</p>
        </div>
      </div>
    </div>
  );
}
