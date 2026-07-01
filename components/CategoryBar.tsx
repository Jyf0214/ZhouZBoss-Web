'use client';

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronRight } from 'lucide-react';

interface CategoryBarProps {
  categories: string[];
  tags?: string[];
  selectedCategory: string | null;
  selectedTag: string | null;
  onSelectCategory: (category: string | null) => void;
  onSelectTag: (tag: string | null) => void;
}

/**
 * 统一筛选栏 — 分类 + 标签合并为一排横向滚动筛选
 * 位于 hero 标题下方，支持鼠标滚轮水平滚动
 */
export function CategoryBar({
  categories,
  tags = [],
  selectedCategory,
  selectedTag,
  onSelectCategory,
  onSelectTag,
}: CategoryBarProps) {
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

  const isAnyFilterActive = selectedCategory !== null || selectedTag !== null;

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-1.5 relative">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-1.5 overflow-x-auto py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* 全部按钮：重置所有筛选 */}
        <Button
          onClick={() => { onSelectCategory(null); onSelectTag(null); }}
          variant={!isAnyFilterActive ? 'primary' : 'ghost'}
          size="sm"
          autoLoading={false}
          rounded="full"
          className={`shrink-0${!isAnyFilterActive ? ' shadow-sm' : ''}`}
        >
          全部
        </Button>

        {/* 分类按钮 */}
        {categories.map((cat) => (
          <Button
            key={`cat-${cat}`}
            onClick={() => {
              onSelectCategory(selectedCategory === cat ? null : cat);
              onSelectTag(null);
            }}
            variant={selectedCategory === cat ? 'primary' : 'ghost'}
            size="sm"
            autoLoading={false}
            rounded="full"
            className={`shrink-0${selectedCategory === cat ? ' shadow-sm' : ''}`}
          >
            {cat}
          </Button>
        ))}

        {/* 标签按钮：仅当有标签时显示分隔符和标签 */}
        {tags.length > 0 && (
          <>
            <div className="shrink-0 w-px bg-zinc-200 my-1.5" aria-hidden="true" />
            {tags.map((tag) => (
              <Button
                key={`tag-${tag}`}
                onClick={() => {
                  onSelectTag(selectedTag === tag ? null : tag);
                  onSelectCategory(null);
                }}
                variant={selectedTag === tag ? 'primary' : 'ghost'}
                size="sm"
                autoLoading={false}
                rounded="full"
                className={`shrink-0${selectedTag === tag ? ' shadow-sm' : ''}`}
              >
                #{tag}
              </Button>
            ))}
          </>
        )}
      </div>

      {/* 右侧渐变遮罩 + "更多"箭头按钮 */}
      <div className="absolute right-0 top-0 bottom-0 w-[72px] pointer-events-none flex items-center justify-end rounded-r-xl bg-gradient-to-l from-white via-white/95 to-transparent">
        <Button
          onClick={scrollRight}
          variant="default"
          size="sm"
          autoLoading={false}
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
