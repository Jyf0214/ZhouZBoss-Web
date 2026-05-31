'use client';

import React, { useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

interface CategoryBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

/**
 * 分类快捷导航栏 — 横向滚动的分类按钮条
 * 位于 hero 区域下方，支持鼠标滚轮水平滚动，移动端 sticky 定位
 */
export function CategoryBar({ categories, selectedCategory, onSelectCategory }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-1.5 relative">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-1.5 overflow-x-auto py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selectedCategory === null
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300'
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat === selectedCategory ? null : cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 右侧渐变遮罩 + "更多"箭头按钮 */}
      <div className="absolute right-0 top-0 bottom-0 w-[72px] pointer-events-none flex items-center justify-end rounded-r-xl bg-gradient-to-l from-white via-white/95 to-transparent">
        <button
          onClick={scrollRight}
          className="w-8 h-8 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all pointer-events-auto mr-1.5"
          aria-label="向右滚动"
        >
          <ChevronRight size={16} className="text-zinc-500" />
        </button>
      </div>
    </div>
  );
}
