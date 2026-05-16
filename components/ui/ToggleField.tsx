import React from 'react';
import { Switch } from 'antd';

export interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export default function ToggleField({
  label,
  description,
  checked,
  onChange,
  className = '',
}: ToggleFieldProps) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 bg-zinc-50 rounded-xl ${className}`}>
      <div>
        <div className="text-sm font-medium text-zinc-900">{label}</div>
        {description && (
          <div className="text-xs text-zinc-400 mt-0.5">{description}</div>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
