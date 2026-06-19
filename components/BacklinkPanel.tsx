'use client';

/**
 * BacklinkPanel - 内容关联引用面板
 *
 * 展示当前内容的双向引用关系：
 * - 引用（outgoing）：当前内容通过 [[标题]] 引用了哪些其他内容
 * - 被引用（backlinks）：哪些其他内容通过 [[标题]] 引用了当前内容
 *
 * 支持两种数据来源：
 * 1. 服务端预渲染：通过 initialBacklinks/initialOutgoing 直接传入（推荐，无额外请求）
 * 2. 客户端动态加载：通过 /api/backlinks 接口获取（用于面孔详情页等客户端渲染场景）
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, GitBranch } from 'lucide-react';
import type { BacklinkInfo, RegistryEntry } from '@/lib/content-registry';

interface BacklinkData {
  backlinks: BacklinkInfo[];
  outgoing: RegistryEntry[];
}

/** 根据 section 和 slug 生成 URL */
function contentUrl(section: string, slug: string): string {
  return section === 'posts' ? `/posts${slug}` : `/faces${slug}`;
}

/** 根据 section 返回类型标签文本 */
function sectionLabel(section: string): string {
  return section === 'posts' ? '文章' : '面孔';
}

/** 渲染引用标签列表 */
function renderLinkTags(
  items: { title: string; section: string; slug: string }[],
) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={`${item.section}-${item.slug}`}
          href={contentUrl(item.section, item.slug)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 hover:border-zinc-200 rounded-lg text-xs text-zinc-600 transition-colors"
        >
          <span className="text-zinc-400 text-[10px]">{sectionLabel(item.section)}</span>
          <span>{item.title}</span>
        </Link>
      ))}
    </div>
  );
}

export function BacklinkPanel({
  section,
  slug,
  initialBacklinks,
  initialOutgoing,
}: {
  section: 'posts' | 'faces';
  slug: string;
  initialBacklinks?: BacklinkInfo[];
  initialOutgoing?: RegistryEntry[];
}) {
  // 优先使用服务端预渲染的数据
  const [data, setData] = useState<BacklinkData | null>(() => {
    if (initialBacklinks || initialOutgoing) {
      return {
        backlinks: initialBacklinks ?? [],
        outgoing: initialOutgoing ?? [],
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);

  // 客户端动态加载（用于没有服务端数据的场景）
  useEffect(() => {
    if (data) return; // 已有数据，跳过

    let cancelled = false;

    async function fetchBacklinks() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/backlinks?section=${encodeURIComponent(section)}&slug=${encodeURIComponent(slug)}`,
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch {
        // 静默失败，面板不展示
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchBacklinks();
    return () => { cancelled = true; };
  }, [section, slug, data]);

  if (loading) {
    return (
      <div className="mt-8 pt-6 border-t border-zinc-100">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <GitBranch size={14} className="animate-pulse" />
          <span>加载关联引用...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasOutgoing = data.outgoing.length > 0;
  const hasBacklinks = data.backlinks.length > 0;

  if (!hasOutgoing && !hasBacklinks) return null;

  return (
    <div className="mt-8 pt-6 border-t border-zinc-100">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={16} className="text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-700">关联引用</h3>
      </div>

      {hasOutgoing && (
        <div className="mb-4">
          <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
            <ArrowUpRight size={12} />
            引用了
          </p>
          {renderLinkTags(data.outgoing)}
        </div>
      )}

      {hasBacklinks && (
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
            <ArrowDownLeft size={12} />
            被引用
          </p>
          {renderLinkTags(data.backlinks)}
        </div>
      )}
    </div>
  );
}
