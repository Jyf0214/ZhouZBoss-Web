import React from 'react';
import { Select, Tag } from 'antd';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import ToggleField from './ToggleField';

interface CoverConfigData {
  indexEnable: boolean;
  asideEnable: boolean;
  archivesEnable: boolean;
  position: 'left' | 'right' | 'both';
  defaultCover: string[];
}

interface CoverConfigProps {
  config: CoverConfigData;
  onChange: (config: CoverConfigData) => void;
}

const positionOptions = [
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' },
  { value: 'both', label: '两侧' },
];

export default function CoverConfig({ config, onChange }: CoverConfigProps) {
  const [input, setInput] = React.useState('');

  const addCover = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (config.defaultCover.includes(trimmed)) return;
    onChange({ ...config, defaultCover: [...config.defaultCover, trimmed] });
    setInput('');
  };

  const removeCover = (url: string) => {
    onChange({ ...config, defaultCover: config.defaultCover.filter(x => x !== url) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ToggleField
          label="首页显示封面"
          checked={config.indexEnable}
          onChange={v => onChange({ ...config, indexEnable: v })}
        />
        <ToggleField
          label="侧栏显示封面"
          checked={config.asideEnable}
          onChange={v => onChange({ ...config, asideEnable: v })}
        />
        <ToggleField
          label="归档页显示封面"
          checked={config.archivesEnable}
          onChange={v => onChange({ ...config, archivesEnable: v })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">封面位置</label>
        <Select
          value={config.position}
          onChange={v => onChange({ ...config, position: v })}
          options={positionOptions}
          style={{ width: '100%' }}
          className="!rounded-lg"
          placement="bottomLeft"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">默认封面图片</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCover()}
            placeholder="图片 URL"
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={addCover} autoLoading={false} className="rounded-lg shrink-0">
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.defaultCover.map(url => (
            <Tag key={url} closable onClose={() => removeCover(url)} className="rounded-lg text-sm max-w-[300px] truncate">
              {url}
            </Tag>
          ))}
          {config.defaultCover.length === 0 && (
            <span className="text-xs text-zinc-400">暂无默认封面</span>
          )}
        </div>
      </div>
    </div>
  );
}
