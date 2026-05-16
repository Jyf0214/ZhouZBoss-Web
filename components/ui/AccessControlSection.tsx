import React from 'react';
import { Switch } from 'antd';
import { Shield } from 'lucide-react';
import ConfigSection from './ConfigSection';

interface AccessItem {
  key: 'posts' | 'faces' | 'diary';
  label: string;
}

interface AccessControlSectionProps {
  title: string;
  items: AccessItem[];
  isPublic: (key: 'posts' | 'faces' | 'diary') => boolean;
  onToggle: (key: 'posts' | 'faces' | 'diary', checked: boolean) => void;
  publicLabel: string;
  privateLabel: string;
}

export default function AccessControlSection({
  title,
  items,
  isPublic,
  onToggle,
  publicLabel,
  privateLabel,
}: AccessControlSectionProps) {
  return (
    <ConfigSection title={title} icon={Shield} color="bg-rose-500">
      <div className="space-y-3">
        {items.map(item => {
          const publicState = isPublic(item.key);
          return (
            <div key={item.key} className="flex items-center justify-between py-3 px-4 bg-zinc-50 rounded-xl">
              <div>
                <div className="text-sm font-medium text-zinc-900">{item.label}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {publicState ? publicLabel : privateLabel}
                </div>
              </div>
              <Switch
                checked={publicState}
                onChange={(checked: boolean) => onToggle(item.key, checked)}
              />
            </div>
          );
        })}
      </div>
    </ConfigSection>
  );
}
