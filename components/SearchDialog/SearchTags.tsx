// SearchTags - 搜索初始状态：提示语 + 热门标签快速筛选

'use client';

import React from 'react';

import { Button } from '@/components/ui/Button';

import { POPULAR_TAGS } from './search-styles';

interface SearchTagsProps {
  onTagClick: (tag: string) => void;
}

export function SearchTags({ onTagClick }: SearchTagsProps) {
  return (
    <div className="py-8 px-6">
      <p className="text-sm text-zinc-400 mb-4 text-center">
        输入关键词搜索文章内容，或点击热门标签快速筛选
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {POPULAR_TAGS.map((tag) => (
          <Button
            key={tag}
            variant="ghost"
            size="sm"
            rounded="full"
            onClick={() => onTagClick(tag)}
            autoLoading={false}
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
