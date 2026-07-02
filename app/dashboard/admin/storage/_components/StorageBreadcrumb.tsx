/**
 * 顶部面包屑 — 可点击跳转到任意祖先目录
 */
'use client';

import { ChevronRight, Home } from 'lucide-react';
import { getAncestorPath, splitPath } from '../_lib/format';

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
  rootLabel: string;
}

export function StorageBreadcrumb({ currentPath, onNavigate, rootLabel }: Props) {
  const segments = splitPath(currentPath);

  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1 text-sm text-zinc-500 overflow-x-auto whitespace-nowrap"
    >
      <button
        type="button"
        onClick={() => onNavigate('')}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
      >
        <Home size={14} />
        <span className="font-medium">{rootLabel}</span>
      </button>
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        const target = getAncestorPath(segments, idx + 1);
        return (
          <span key={`${idx}-${seg}`} className="inline-flex items-center gap-1">
            <ChevronRight size={14} className="text-zinc-300" />
            {isLast ? (
              <span className="px-2 py-1 font-semibold text-zinc-900">{seg}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(target)}
                className="px-2 py-1 rounded-md hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                {seg}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default StorageBreadcrumb;
