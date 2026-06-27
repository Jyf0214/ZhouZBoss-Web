'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DiaryFilters({
  searchText,
  setSearchText,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: {
  searchText: string;
  setSearchText: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
      <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-sm">
        <Search size={14} className="sm:size-4 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索日记..."
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm"
        />
      </div>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="px-2 sm:px-3 py-2 sm:py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 text-xs sm:text-sm w-[130px] sm:w-auto"
        title="开始日期"
      />
      <span className="text-zinc-400 text-xs sm:text-sm">—</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="px-2 sm:px-3 py-2 sm:py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 text-xs sm:text-sm w-[130px] sm:w-auto"
        title="结束日期"
      />
    </div>
  );
}

export function GroupTabs({
  groups,
  activeGroup,
  onSelect,
}: {
  groups: string[];
  activeGroup: string | null;
  onSelect: (g: string | null) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant={activeGroup === null ? 'primary' : 'ghost'}
        size="sm"
        rounded="full"
        autoLoading={false}
        onClick={() => onSelect(null)}
      >全部</Button>
      {groups.map((g) => (
        <Button
          key={g}
          variant={activeGroup === g ? 'primary' : 'ghost'}
          size="sm"
          rounded="full"
          autoLoading={false}
          onClick={() => onSelect(g)}
        >{g}</Button>
      ))}
    </div>
  );
}
