'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfig } from '@/hooks/use-config';
import { List } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const { config } = useConfig();
  const cfg = config?.toc;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);

  const isDisabled = cfg?.post === false;

  useEffect(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: TocItem[] = [];
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1]!.length;
      const text = match[2]!.replace(/[`*_~\[\]()]/g, '').trim();
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
      headings.push({ id, text, level });
    }
    setItems(headings);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (isDisabled || items.length === 0) return null;

  const maxLevel = Math.min(...items.map(i => i.level));

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:shadow-xl transition-all"
        aria-label="目录"
      >
        <List size={20} />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-6 z-50 w-64 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-zinc-100 p-4"
        >
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">目录</h4>
          <nav className="space-y-1">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    setOpen(false);
                  }
                }}
                className={`block w-full text-left text-sm py-1 rounded-lg px-2 transition-colors ${
                  activeId === item.id
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                }`}
                style={{ paddingLeft: `${(item.level - maxLevel) * 12 + 8}px` }}
              >
                {cfg?.number && `${i + 1}. `}{item.text}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
