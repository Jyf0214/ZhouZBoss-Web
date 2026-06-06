'use client';

import { useState, useEffect } from 'react';

interface HeadingRef {
  id: string;
}

/**
 * 监听页面中各标题元素的可见性，返回当前高亮的标题 id。
 *
 * - 通过 IntersectionObserver 监听所有 heading 元素
 * - 首个进入视口（顶部偏移 80px、底部 80%）的标题被设为 active
 * - headings 变化时自动重新挂载观察器
 */
export function useTocActive(headings: HeadingRef[]): string {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  return activeId;
}
