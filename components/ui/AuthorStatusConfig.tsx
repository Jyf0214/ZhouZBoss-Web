import React from 'react';
import { Button, Tag } from 'antd';
import { Plus } from 'lucide-react';
import FormField from './FormField';
import ToggleField from './ToggleField';

interface AuthorStatusConfigData {
  enable: boolean;
  statusImg: string;
  skills: string[];
}

interface AuthorStatusConfigProps {
  config: AuthorStatusConfigData;
  onChange: (config: AuthorStatusConfigData) => void;
}

export default function AuthorStatusConfig({ config, onChange }: AuthorStatusConfigProps) {
  const [input, setInput] = React.useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (config.skills.includes(trimmed)) return;
    onChange({ ...config, skills: [...config.skills, trimmed] });
    setInput('');
  };

  const removeSkill = (s: string) => {
    onChange({ ...config, skills: config.skills.filter(x => x !== s) });
  };

  return (
    <div className="space-y-4">
      <ToggleField
        label="启用作者卡片"
        description="在文章页等位置显示作者状态卡片"
        checked={config.enable}
        onChange={v => onChange({ ...config, enable: v })}
      />

      <FormField
        label="状态图片 URL"
        value={config.statusImg}
        onChange={v => onChange({ ...config, statusImg: v })}
        placeholder="https://example.com/status.png"
      />

      <div>
        <label className="block text-sm font-medium mb-2">技能标签</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSkill()}
            placeholder="例如: 🤖️ 数码科技爱好者"
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <Button size="small" icon={<Plus size={14} />} onClick={addSkill} className="rounded-lg shrink-0">
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.skills.map(s => (
            <Tag key={s} closable onClose={() => removeSkill(s)} className="rounded-lg text-sm">
              {s}
            </Tag>
          ))}
          {config.skills.length === 0 && (
            <span className="text-xs text-zinc-400">暂无技能标签</span>
          )}
        </div>
      </div>
    </div>
  );
}
