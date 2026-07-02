'use client';

import { useState, useMemo, useEffect } from 'react';
import type { TOCProps, TocHeading, TocNode } from './toc-types';
import { useTocActive } from './use-toc-active';
import { TocItem } from './TocItem';
import { slugify } from '@/lib/slugify';

export type { TOCConfig, TOCProps, TocHeading, TocNode, TocItemProps } from './toc-types';

// 将扁平的标题列表按 level 构造成嵌套树
function buildTree(items: TocHeading[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const item of items) {
    const node: TocNode = { ...item, children: [] };
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top || top.level >= node.level) {
        stack.pop();
      } else {
        break;
      }
    }
    if (stack.length > 0) {
      stack[stack.length - 1]!.children.push(node);
    } else {
      root.push(node);
    }
    stack.push(node);
  }

  return root;
}

/**
 * 文章目录组件
 *
 * - 从 Markdown 内容中提取 h2~h4 标题
 * - 桌面端：sticky 侧边栏
 * - 移动端：右下角浮动按钮 + 折叠面板
 * - 滚动时通过 IntersectionObserver 高亮当前标题
 * - 少于 3 个标题时不渲染
 */
export function TOC({ content, config, locale }: TOCProps) {
  const [mobileOpen, setMobileOpen] = useState(config?.expand ?? false);
  const [isShortScreen, setIsShortScreen] = useState(false);

  useEffect(() => {
    const checkHeight = () => {
      setIsShortScreen(window.innerHeight < 500);
    };
    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => window.removeEventListener('resize', checkHeight);
  }, []);

  const headings = useMemo<TocHeading[]>(() => {
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const result: TocHeading[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const level = match[1]!.length;
      // 跳过 h1（通常是文章标题），只处理 h2-h4
      if (level <= 1) continue;
      if (level > 4) continue;
      const text = match[2]!.replace(/[`*_~\[\]()]/g, '').trim();
      const id = slugify(text);
      result.push({ id, text, level });
    }
    return result;
  }, [content]);

  const tree = useMemo(() => buildTree(headings), [headings]);
  const activeId = useTocActive(headings);

  // 少于 3 个标题时返回 null
  if (headings.length < 3) return null;

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  const label = locale === 'zh' || locale === 'zh-CN' || locale === 'zh-TW' ? '目录' : 'Table of Contents';

  return (
    <>
      {/* 桌面端：sticky 侧边栏 */}
      <nav className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3 px-3">
          {label}
        </h4>
        <TocItem
          items={tree}
          activeId={activeId}
          numbering={config?.number}
          onLinkClick={handleLinkClick}
        />
      </nav>

      {/* 移动端：折叠面板 */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <details
          open={mobileOpen}
          onToggle={(e) => setMobileOpen((e.target as HTMLDetailsElement).open)}
          className="group"
        >
          <summary className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-700 flex items-center justify-center cursor-pointer list-none text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-xl transition-all">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </summary>
          <div className={`absolute right-0 w-64 max-h-80 overflow-y-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 p-4 ${
            isShortScreen ? 'top-full' : 'bottom-16'
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
              {label}
            </h4>
            <TocItem
              items={tree}
              activeId={activeId}
              numbering={config?.number}
              onLinkClick={handleLinkClick}
            />
          </div>
        </details>
      </div>
    </>
  );
}

export default TOC;
