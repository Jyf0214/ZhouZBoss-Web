import React from 'react';
import { Tag } from 'antd';
import { Plus } from 'lucide-react';
import ToggleField from './ToggleField';
import { Button } from '@/components/ui/Button';

interface MournConfigData {
  enable: boolean;
  days: string[];
}

interface MournConfigProps {
  config: MournConfigData;
  onChange: (config: MournConfigData) => void;
}

export default function MournConfig({ config, onChange }: MournConfigProps) {
  const [input, setInput] = React.useState('');

  const addDay = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!/^\d{1,2}-\d{1,2}$/.test(trimmed)) return;
    if (config.days.includes(trimmed)) return;
    onChange({ ...config, days: [...config.days, trimmed] });
    setInput('');
  };

  const removeDay = (d: string) => {
    onChange({ ...config, days: config.days.filter(x => x !== d) });
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label="启用哀悼日"
        description="指定日期首页自动变灰"
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <div>
        <label className="block text-sm font-medium mb-2">哀悼日期（月-日）</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDay()}
            placeholder="例如: 4-5"
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={addDay} autoLoading={false} className="rounded-lg shrink-0">
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.days.map(d => (
            <Tag key={d} closable onClose={() => removeDay(d)} className="rounded-lg text-sm">
              {d}
            </Tag>
          ))}
          {config.days.length === 0 && (
            <span className="text-xs text-zinc-400">暂无日期</span>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-2">示例: 4-5 (清明节)、5-12 (汶川)、7-7 (七七)、9-18 (九一八)、12-13 (国家公祭日)</p>
      </div>
    </div>
  );
}
