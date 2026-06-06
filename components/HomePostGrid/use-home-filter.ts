import { useEffect, useState } from 'react';
import type { PostItem } from './types';
import { PAGE_SIZE } from './home-constants';

export interface UseHomeFilterResult {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag, selectedCategory]);

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || []))).sort();

  const filteredPosts = posts
    .filter((p) => {
      if (selectedCategory && !p.tags?.some((tag) => tag === selectedCategory)) return false;
      if (selectedTag && !p.tags?.includes(selectedTag)) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false)
      );
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime();
    });

  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return {
    searchTerm,
    setSearchTerm,
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
