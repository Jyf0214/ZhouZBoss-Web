import React from 'react';
import { Button } from 'antd';
import { Plus, Trash2 } from 'lucide-react';

type SocialConfigData = Record<string, string>;

interface SocialConfigProps {
  config: SocialConfigData;
  onChange: (config: SocialConfigData) => void;
}

export default function SocialConfig({ config, onChange }: SocialConfigProps) {
  const entries = Object.entries(config);

  const addEntry = () => {
    const key = `social-${entries.length + 1}`;
    onChange({ ...config, [key]: '' });
  };

  const removeEntry = (key: string) => {
    const next = { ...config };
    delete next[key];
    onChange(next);
  };

  const updateKey = (oldKey: string, newKey: string) => {
    const next = { ...config };
    next[newKey] = next[oldKey];
    if (newKey !== oldKey) delete next[oldKey];
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-zinc-400 py-4 text-center bg-zinc-50 rounded-xl">
          暂无社交链接，点击下方按钮添加
        </p>
      )}

      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <input
            type="text"
            value={key}
            onChange={e => updateKey(key, e.target.value)}
            placeholder="名称 (如 Github)"
            className="w-[140px] h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <input
            type="text"
            value={value}
            onChange={e => updateValue(key, e.target.value)}
            placeholder="链接 || 图标 (可选)"
            className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
          <button
            onClick={() => removeEntry(key)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <Button size="small" icon={<Plus size={14} />} onClick={addEntry} className="rounded-lg">
        添加社交链接
      </Button>
      <p className="text-xs text-zinc-400">格式: 名称: 链接 || 图标 (图标可选，如 fab fa-github)</p>
    </div>
  );
}
