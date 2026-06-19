// SearchInput - 搜索对话框顶部输入栏
// 负责：搜索图标、输入框、加载指示器、关闭按钮。

'use client';

import React from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchInput({
  value,
  onChange,
  loading,
  onClose,
  inputRef,
}: SearchInputProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
      <Search
        size={20}
        className="text-zinc-400 dark:text-zinc-500 shrink-0"
      />
      <input
        ref={inputRef}
        type="text"
        placeholder="搜索文章、日记、标签..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="搜索文章、日记、标签"
        className="flex-1 text-base sm:text-lg outline-none border-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 leading-relaxed"
      />
      {loading && (
        <Loader2
          size={18}
          className="text-zinc-400 animate-spin shrink-0"
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        rounded="sm"
        iconOnly
        onClick={onClose}
        aria-label="关闭搜索"
      >
        <X size={18} />
      </Button>
    </div>
  );
}
