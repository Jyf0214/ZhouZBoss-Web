'use client';

import { useState, useEffect, useMemo } from 'react';

interface TOCConfig {
  number?: boolean;
  expand?: boolean;
  styleSimple?: boolean;
}

interface TOCProps {
  content: string;
  config?: TOCConfig;
  locale?: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
}

function buildTree(items: { id: string; text: string; level: number }[]): TocItem[] {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const item of items) {
    const node: TocItem = { ...item, children: [] };
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

function TocTree({
  items,
  activeId,
  depth = 0,
  numbering,
  prefix = '',
  onLinkClick,
}: {
  items: TocItem[];
  activeId: string;
  depth?: number;
  numbering?: boolean;
  prefix?: string;
  onLinkClick?: () => void;
}) {
  let counter = 0;

  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'ml-4 space-y-0.5'}>
      {items.map((item) => {
        counter++;
        const num = prefix ? `${prefix}.${counter}` : `${counter}`;
        const isActive = activeId === item.id;

        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                onLinkClick?.();
              }}
              className={`
                block py-1 text-sm transition-colors duration-150
                ${isActive
                  ? 'text-zinc-900 font-semibold border-l-2 border-zinc-900 -ml-px pl-3'
                  : 'text-zinc-400 hover:text-zinc-600 border-l-2 border-transparent pl-3'
                }
              `}
            >
              {numbering && (
                <span className="mr-1.5 text-zinc-400 text-xs">{num}</span>
              )}
              {item.text}
            </a>
            {item.children.length > 0 && (
              <TocTree
                items={item.children}
                activeId={activeId}
                depth={depth + 1}
                numbering={numbering}
                prefix={num}
                onLinkClick={onLinkClick}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TOC({ content, config, locale }: TOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState(config?.expand ?? false);

  const headings = useMemo(() => {
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const result: { id: string; text: string; level: number }[] = [];
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
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 px-3">
          {label}
        </h4>
        <TocTree
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
          <summary className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center cursor-pointer list-none text-zinc-500 hover:text-zinc-900 hover:shadow-xl transition-all">
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
          <div className="absolute bottom-16 right-0 w-64 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-zinc-100 p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
              {label}
            </h4>
            <TocTree
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
