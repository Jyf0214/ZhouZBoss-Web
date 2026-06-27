'use client';

// 标签 / 受理人输入行(输入框 + 添加按钮 + 已选 tag 列表)
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

interface TagInputRowProps {
  label: string;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  addButtonLabel: string;
  items: string[];
  onRemove: (item: string) => void;
}

export function TagInputRow({
  label, inputValue, onInputChange, onSubmit,
  placeholder, addButtonLabel, items, onRemove,
}: TagInputRowProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <Input
          type="text"
          size="sm"
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button onClick={onSubmit} size="sm" autoLoading={false}>{addButtonLabel}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Tag key={item} size="sm" className="flex items-center gap-1">
            {item}
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Trash2 size={16} />}
              className="text-red-500"
              onClick={() => onRemove(item)}
              autoLoading={false}
            />
          </Tag>
        ))}
      </div>
    </div>
  );
}
