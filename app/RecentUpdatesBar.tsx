'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface UpdateItem {
  text: string;
  link?: string;
}

interface RecentUpdatesBarProps {
  updates: UpdateItem[];
  viewAllLink?: string;
  viewAllText?: string;
}

/**
 * 最新动态滚动条 — 垂直轮播显示最新消息
 * 位于分类栏和文章列表之间，鼠标悬停暂停轮播
 */
export function RecentUpdatesBar({
  updates,
  viewAllLink = '/updates',
  viewAllText = '更多',
}: RecentUpdatesBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ITEM_HEIGHT = 24; // h-6 = 1.5rem = 24px

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPaused || updates.length <= 1) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % updates.length);
    }, 3000);

    return clearTimer;
  }, [isPaused, updates.length, clearTimer]);

  if (updates.length === 0) return null;

  return (
    <div
      className="bg-white rounded-xl border border-zinc-100 shadow-sm px-4 py-3 flex items-center gap-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 图标 */}
      <div className="shrink-0 w-9 h-9 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500">
        <Bell size={16} />
      </div>

      {/* 垂直轮播区域 */}
      <div className="flex-1 min-w-0 overflow-hidden" style={{ height: ITEM_HEIGHT }}>
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(-${currentIndex * ITEM_HEIGHT}px)` }}
        >
          {updates.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center"
              style={{ height: ITEM_HEIGHT }}
            >
              {item.link ? (
                <Link
                  href={item.link}
                  className="text-sm text-zinc-700 hover:text-zinc-900 transition-colors truncate w-full"
                >
                  {item.text}
                </Link>
              ) : (
                <span className="text-sm text-zinc-700 truncate w-full">
                  {item.text}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 查看全部 */}
      {viewAllLink && (
        <Link
          href={viewAllLink}
          className="shrink-0 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 transition-colors ml-auto"
        >
          {viewAllText}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
