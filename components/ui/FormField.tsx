import React from 'react';
import { Select, Input } from 'antd';

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  className?: string;
}

export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  options,
  rows = 4,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {type === 'textarea' && (
        <Input.TextArea
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {type === 'select' && options && (
        <Select
          value={value}
          onChange={onChange}
          options={options}
          style={{ width: '100%' }}
        />
      )}
      {type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
        />
      )}
    </div>
  );
}
