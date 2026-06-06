'use client';

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
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
        <Button
          onClick={() => onSelectCategory(null)}
          variant={selectedCategory === null ? 'primary' : 'ghost'}
          size="sm"
          rounded="full"
          className={`shrink-0${selectedCategory === null ? ' shadow-sm' : ''}`}
        >
          全部
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            onClick={() => onSelectCategory(cat === selectedCategory ? null : cat)}
            variant={selectedCategory === cat ? 'primary' : 'ghost'}
            size="sm"
            rounded="full"
            className={`shrink-0${selectedCategory === cat ? ' shadow-sm' : ''}`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* 右侧渐变遮罩 + "更多"箭头按钮 */}
      <div className="absolute right-0 top-0 bottom-0 w-[72px] pointer-events-none flex items-center justify-end rounded-r-xl bg-gradient-to-l from-white via-white/95 to-transparent">
        <Button
          onClick={scrollRight}
          variant="default"
          size="sm"
          iconOnly
          rounded="full"
          icon={<ChevronRight size={16} className="text-zinc-500" />}
          aria-label="向右滚动"
          className="pointer-events-auto mr-1.5 shadow-sm active:scale-95"
        />
      </div>
    </div>
  );
}
