import React from 'react';
import ToggleField from './ToggleField';
import FormField from './FormField';

interface FooterOwnerConfig {
  enable: boolean;
  since: number;
}

interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
}

interface FooterConfigData {
  owner: FooterOwnerConfig;
  customText: string;
  runtime: FooterRuntimeConfig;
}

interface FooterConfigProps {
  config: FooterConfigData;
  onChange: (config: FooterConfigData) => void;
}

export default function FooterConfig({ config, onChange }: FooterConfigProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">所有者信息</h3>
        <ToggleField
          label="显示版权信息"
          checked={config.owner.enable}
          onChange={v => onChange({ ...config, owner: { ...config.owner, enable: v } })}
        />
        <FormField
          label="起始年份"
          value={String(config.owner.since)}
          onChange={v => onChange({ ...config, owner: { ...config.owner, since: parseInt(v) || 2020 } })}
          placeholder="2020"
        />
      </div>

      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">自定义文本</h3>
        <FormField
          label="自定义页脚文字"
          value={config.customText}
          onChange={v => onChange({ ...config, customText: v })}
          placeholder="例如：本站内容采用 CC BY-NC-SA 4.0 许可"
        />
      </div>

      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">运行时间</h3>
        <ToggleField
          label="显示运行时间"
          description="显示网站已运行天数"
          checked={config.runtime.enable}
          onChange={v => onChange({ ...config, runtime: { ...config.runtime, enable: v } })}
        />
        <FormField
          label="网站上线时间"
          value={config.runtime.launchTime}
          onChange={v => onChange({ ...config, runtime: { ...config.runtime, launchTime: v } })}
          placeholder="04/01/2021 00:00:00"
        />
      </div>
    </div>
  );
}
