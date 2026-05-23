import React from 'react';
import ToggleField from './ToggleField';

interface TocConfigData {
  post: boolean;
  page: boolean;
  number: boolean;
  expand: boolean;
  styleSimple: boolean;
}

interface TocConfigProps {
  config: TocConfigData;
  onChange: (config: TocConfigData) => void;
}

export default function TocConfig({ config, onChange }: TocConfigProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ToggleField label="文章目录" checked={config.post} onChange={v => onChange({ ...config, post: v })} />
        <ToggleField label="页面目录" checked={config.page} onChange={v => onChange({ ...config, page: v })} />
        <ToggleField label="显示编号" checked={config.number} onChange={v => onChange({ ...config, number: v })} />
        <ToggleField label="默认展开" checked={config.expand} onChange={v => onChange({ ...config, expand: v })} />
      </div>
      <ToggleField label="简洁样式" description="文章页目录简洁样式" checked={config.styleSimple} onChange={v => onChange({ ...config, styleSimple: v })} />
    </div>
  );
}
