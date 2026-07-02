import React from 'react';
import ToggleField from './ToggleField';

interface WordCountConfigData {
  enable: boolean;
  postWordcount: boolean;
  min2read: boolean;
  totalWordcount: boolean;
}

interface WordCountConfigProps {
  config: WordCountConfigData;
  onChange: (config: WordCountConfigData) => void;
}

export default function WordCountConfig({ config, onChange }: WordCountConfigProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ToggleField label="启用" checked={config.enable} onChange={v => onChange({ ...config, enable: v })} />
      <ToggleField label="文章字数" checked={config.postWordcount} onChange={v => onChange({ ...config, postWordcount: v })} />
      <ToggleField label="阅读时长" description="预计阅读时间" checked={config.min2read} onChange={v => onChange({ ...config, min2read: v })} />
      <ToggleField label="总字数" description="全站累计" checked={config.totalWordcount} onChange={v => onChange({ ...config, totalWordcount: v })} />
    </div>
  );
}
