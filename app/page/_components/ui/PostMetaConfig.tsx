import React from 'react';
import { Select } from 'antd';
import ToggleField from './ToggleField';

interface PostMetaItemConfig {
  dateType: string;
  dateFormat: string;
  categories: boolean;
  tags: boolean;
  label: boolean;
}

interface PostMetaPostConfig extends PostMetaItemConfig {
  unread: boolean;
}

interface PostMetaConfigData {
  page: PostMetaItemConfig & { dateFormat: string };
  post: PostMetaPostConfig;
}

interface PostMetaConfigProps {
  config: PostMetaConfigData;
  onChange: (config: PostMetaConfigData) => void;
}

const dateTypeOptions = [
  { value: 'created', label: '创建日期' },
  { value: 'updated', label: '更新日期' },
  { value: 'both', label: '两者都显示' },
];

const dateFormatOptions = [
  { value: 'date', label: '标准日期' },
  { value: 'relative', label: '相对日期' },
  { value: 'simple', label: '简单日期' },
];

const postDateFormatOptions = [
  { value: 'date', label: '标准日期' },
  { value: 'relative', label: '相对日期' },
];

function MetaItemEditor({
  prefix,
  config,
  onChange,
  showUnread,
}: {
  prefix: string;
  config: PostMetaItemConfig;
  onChange: (c: PostMetaItemConfig) => void;
  showUnread?: boolean;
}) {
  return (
    <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{prefix}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">日期类型</label>
          <Select
            size="small"
            value={config.dateType}
            onChange={v => onChange({ ...config, dateType: v })}
            options={dateTypeOptions}
            style={{ width: '100%' }}
            className="!rounded-lg"
            placement="bottomLeft"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">日期格式</label>
          <Select
            size="small"
            value={config.dateFormat}
            onChange={v => onChange({ ...config, dateFormat: v })}
            options={prefix === '首页' ? dateFormatOptions : postDateFormatOptions}
            style={{ width: '100%' }}
            className="!rounded-lg"
            placement="bottomLeft"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ToggleField label="显示分类" checked={config.categories} onChange={v => onChange({ ...config, categories: v })} />
        <ToggleField label="显示标签" checked={config.tags} onChange={v => onChange({ ...config, tags: v })} />
        <ToggleField label="显示描述" checked={config.label} onChange={v => onChange({ ...config, label: v })} />
        {showUnread && (
          <ToggleField label="未读标记" checked={(config as PostMetaPostConfig).unread} onChange={v => onChange({ ...config, unread: v } as unknown as PostMetaItemConfig)} />
        )}
      </div>
    </div>
  );
}

export default function PostMetaConfig({ config, onChange }: PostMetaConfigProps) {
  return (
    <div className="space-y-4">
      <MetaItemEditor
        prefix="首页"
        config={config.page}
        onChange={v => onChange({ ...config, page: { ...v, dateFormat: v.dateFormat } })}
      />
      <MetaItemEditor
        prefix="文章页"
        config={config.post}
        onChange={v => onChange({ ...config, post: v as PostMetaPostConfig })}
        showUnread
      />
    </div>
  );
}
