'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, FileText, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title: string;
  description: string;
  tags: string[];
  slug: string;
  matchPreview: string;
  type: 'post' | 'diary';
}

interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

interface SearchResponse {
  results: SearchResult[];
  groups: SearchGroup[];
}

// ─── Highlight Text ─────────────────────────────────────────────────────────

/** 转义正则特殊字符 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 高亮匹配文本片段 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) {
    return <>{text}</>;
  }

  try {
    const escaped = escapeRegExp(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span
              key={i}
              className="text-amber-600 bg-amber-50 rounded-sm px-0.5 font-medium"
            >
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** 加载状态：旋转指示器 */
function SearchLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  );
}

/** 空状态：未找到结果 */
function SearchEmpty({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
        <Search size={24} className="text-zinc-300" />
      </div>
      <p className="text-zinc-500 font-medium">
        未找到与「{query}」相关的内容
      </p>
      <p className="text-zinc-400 text-sm mt-1">请尝试其他关键词或标签</p>
    </div>
  );
}

/** 初始状态：搜索提示和热门标签 */
function SearchInitial({ onTagClick }: { onTagClick: (tag: string) => void }) {
  const popularTags = ['随笔', '旅行', '日常', '北京', '私密'];

  return (
    <div className="py-8 px-6">
      <p className="text-sm text-zinc-400 mb-4 text-center">
        输入关键词搜索文章内容，或点击热门标签快速筛选
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {popularTags.map((tag) => (
          <Button
            key={tag}
            variant="ghost"
            size="sm"
            rounded="full"
            onClick={() => onTagClick(tag)}
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** 单条搜索结果项 */
function SearchResultItem({
  result,
  query,
  onClose,
}: {
  result: SearchResult;
  query: string;
  onClose: () => void;
}) {
  const href =
    result.type === 'diary' ? result.slug : `/posts${result.slug}`;

  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-start gap-4 px-6 py-3.5 hover:bg-zinc-50 transition-colors rounded-lg mx-2 group"
    >
      {/* 左侧图标 */}
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0 group-hover:bg-zinc-100 transition-colors">
        {result.type === 'diary' ? (
          <BookOpen size={18} className="text-zinc-400" />
        ) : (
          <FileText size={18} className="text-zinc-400" />
        )}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-zinc-900 truncate leading-snug">
          <HighlightText text={result.title} query={query} />
        </h4>
        {result.matchPreview && (
          <p className="text-sm text-zinc-400 mt-0.5 line-clamp-1 leading-relaxed">
            <HighlightText text={result.matchPreview} query={query} />
          </p>
        )}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {result.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} variant="light" size="sm">{tag}</Tag>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Main Dialog ────────────────────────────────────────────────────────────

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 打开时聚焦输入框，关闭时重置状态 ──
  useEffect(() => {
    if (open) {
      // 延迟聚焦以确保动画完成后生效
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
      setResults([]);
      setGroups([]);
      setLoading(false);
      setHasSearched(false);
    }
  }, [open]);

  // ── 防抖搜索 ──
  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setGroups([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
      );
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.results ?? []);
        setGroups(data.groups ?? []);
      } else {
        setResults([]);
        setGroups([]);
      }
    } catch {
      setResults([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // ── ESC 关闭 ──
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // ── 点击热门标签 ──
  const handleTagClick = useCallback((tag: string) => {
    setQuery(tag);
  }, []);

  // ── Render ──
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 搜索输入栏 ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100">
              <Search
                size={20}
                className="text-zinc-400 shrink-0"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="搜索文章、日记、标签..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-base sm:text-lg outline-none border-none bg-transparent text-zinc-900 placeholder:text-zinc-300 leading-relaxed"
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

            {/* ── ESC 快捷键提示 ── */}
            <div className="absolute top-4 right-14 hidden sm:flex items-center gap-1 text-[11px] text-zinc-300 select-none">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 font-mono">
                ESC
              </kbd>
            </div>

            {/* ── 搜索结果区域 ── */}
            <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain py-2">
              {/* 初始状态：未搜索 */}
              {!hasSearched && !query && (
                <SearchInitial onTagClick={handleTagClick} />
              )}

              {/* 加载中 */}
              {loading && <SearchLoading />}

              {/* 空结果 */}
              {!loading && hasSearched && results.length === 0 && (
                <SearchEmpty query={query} />
              )}

              {/* 结果分组 */}
              {!loading &&
                groups.map((group) => (
                  <div key={group.type}>
                    {/* 分组标题 */}
                    <div className="px-6 py-2.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                        {group.label}
                        <span className="ml-1.5 font-normal normal-case text-zinc-300">
                          ({group.results.length})
                        </span>
                      </h3>
                    </div>

                    {/* 分组结果列表 */}
                    {group.results.map((result) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        query={query}
                        onClose={onClose}
                      />
                    ))}
                  </div>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
