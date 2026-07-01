import { useEffect, useMemo, useState } from 'react';
import type { PostItem } from './types';
import { PAGE_SIZE } from './home-constants';

export interface UseHomeFilterResult {
  selectedTag: string | null;
  setSelectedTag: (v: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (v: string | null) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  filteredPosts: PostItem[];
  totalPages: number;
  paginatedPosts: PostItem[];
  allTags: string[];
}

export function useHomeFilter(posts: PostItem[]): UseHomeFilterResult {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, selectedCategory]);

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.tags || []))).sort(),
    [posts],
  );

  const filteredPosts = useMemo(
    () =>
      posts
        .filter((p) => {
          if (selectedCategory && !p.tags?.some((tag) => tag === selectedCategory)) return false;
          if (selectedTag && !p.tags?.includes(selectedTag)) return false;
          return true;
        })
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime();
        }),
    [posts, selectedTag, selectedCategory],
  );

  const totalPages = useMemo(
    () => Math.ceil(filteredPosts.length / PAGE_SIZE),
    [filteredPosts],
  );

  const paginatedPosts = useMemo(
    () => filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredPosts, currentPage],
  );

  return {
    selectedTag,
    setSelectedTag,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    filteredPosts,
    totalPages,
    paginatedPosts,
    allTags,
  };
}
