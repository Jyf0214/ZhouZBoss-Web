'use client';

import { Search, BookOpen } from 'lucide-react';
import { Input } from 'antd';

export function PostListHeader({
  searchTerm,
  onSearchChange,
  postCount,
  t,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  postCount: number;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-10">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
        <Input
          placeholder={t('home.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 h-12 text-base w-full rounded-2xl bg-white border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 transition-colors"
          size="large"
          variant="outlined"
          allowClear
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-zinc-200">
          <BookOpen size={16} className="text-zinc-400" />
          <span className="text-sm font-bold text-zinc-900">{postCount}</span>
          <span className="text-xs text-zinc-400">{t('common.info') === '提示' ? '篇' : 'posts'}</span>
        </div>
      </div>
    </div>
  );
}
