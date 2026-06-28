'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * 监听页面中各标题元素的可见性，返回当前高亮的标题 id。
 *
 * - 通过 IntersectionObserver 监听所有 heading 元素
 * - rootMargin: 顶部留 80px 导航栏空间，底部留 30% 可见区域
 * - 首个进入视口的标题被设为 active
 * - headings 内容不变时不重建 observer，避免引用变化导致反复重建
 */
export function useActiveHeading(headings: { id: string }[]): string {
  const [activeId, setActiveId] = useState<string>('');
  const prevJsonRef = useRef<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const nextJson = JSON.stringify(headings);
    if (nextJson === prevJsonRef.current) return;
    prevJsonRef.current = nextJson;

    // 清理旧 observer
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    observerRef.current = observer;

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [headings]);

  return activeId;
}
