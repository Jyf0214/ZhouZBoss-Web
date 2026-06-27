'use client';

import React from 'react';
import { Calendar, Tag, Eye, X, Loader2, Edit3, Trash2, Pin, History } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/Button';
import { formatShortDate, renderReferenceLinks } from './diary-utils';
import type { DiaryEntry } from './types';
import type { WikiLinkMap } from '@/components/MarkdownRenderer/types';

/** 缓存 wiki-link 映射表，避免重复请求 */
let cachedWikiLinkMap: WikiLinkMap | null = null;
let wikiLinkMapPromise: Promise<WikiLinkMap> | null = null;

function useWikiLinkMap(): WikiLinkMap | undefined {
  const [map, setMap] = React.useState<WikiLinkMap | undefined>(
    cachedWikiLinkMap ?? undefined,
  );

  React.useEffect(() => {
    if (cachedWikiLinkMap) {
      setMap(cachedWikiLinkMap);
      return;
    }

    wikiLinkMapPromise ??= fetch('/api/wiki-link-map')
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));

    void wikiLinkMapPromise.then((data) => {
      cachedWikiLinkMap = data;
      setMap(data);
    });
  }, []);

  return map;
}

export function DiaryCard({
  diary,
  viewingId,
  viewContent,
  viewLoading,
  deleting,
  pinning,
  onView,
  onTogglePin,
  onEdit,
  onDelete,
  onVersionHistory,
}: {
  diary: DiaryEntry;
  viewingId: string | null;
  viewContent: string;
  viewLoading: boolean;
  deleting: string | null;
  pinning: string | null;
  onView: (d: DiaryEntry) => void;
  onTogglePin: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVersionHistory?: (id: string) => void;
}) {
  const isViewing = viewingId === diary.id;
  const wikiLinkMap = useWikiLinkMap();

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      <div
        className="p-4 sm:p-6 cursor-pointer hover:bg-zinc-50 transition-colors"
        onClick={() => onView(diary)}
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-xl font-bold text-zinc-900 mb-1 sm:mb-2 flex items-center gap-2">
              {diary.pinned && <Pin size={16} className="text-amber-500 shrink-0 fill-amber-500" />}
              {diary.title}
              {diary.group && diary.group !== '默认' && (
                <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{diary.group}</span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-400">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Calendar size={12} className="sm:size-[14]" />
                <span>{formatShortDate(diary.date)}</span>
              </div>
              {diary.tags.length > 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Tag size={12} className="sm:size-[14]" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{diary.tags.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              rounded="sm"
              onClick={() => onTogglePin(diary.id)}
              disabled={pinning === diary.id}
              loading={pinning === diary.id}
              title={diary.pinned ? '取消置顶' : '置顶'}
              className={`${
                diary.pinned
                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              icon={<Pin size={14} className={diary.pinned ? 'fill-amber-500' : ''} />}
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              rounded="sm"
              autoLoading={false}
              onClick={() => onEdit(diary.id)}
              title="编辑"
              className="text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              icon={<Edit3 size={14} />}
            />
            <Button
              variant="dangerGhost"
              size="sm"
              iconOnly
              rounded="sm"
              onClick={() => onDelete(diary.id)}
              disabled={deleting === diary.id}
              loading={deleting === diary.id}
              title="删除"
              aria-label="删除"
              icon={<Trash2 size={14} />}
            />
            {onVersionHistory && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                rounded="sm"
                autoLoading={false}
                onClick={() => onVersionHistory(diary.id)}
                title="版本历史"
                className="text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                icon={<History size={14} />}
              />
            )}
            <div className="p-1.5 sm:p-2 text-zinc-400" title={isViewing ? '收起' : '展开'}>
              {isViewing ? <X size={14} className="sm:size-4" /> : <Eye size={14} className="sm:size-4" />}
            </div>
          </div>
        </div>
      </div>

      {isViewing && (
        <div className="border-t border-zinc-100 px-4 sm:px-6 py-4 sm:py-5">
          {viewLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 size={20} className="sm:size-6 text-zinc-300 animate-spin" />
            </div>
          ) : (
            <>
              <div className="prose prose-zinc max-w-none prose-sm sm:prose-base">
                <MarkdownRenderer content={viewContent} wikiLinkMap={wikiLinkMap} />
              </div>
              {renderReferenceLinks(diary.references, viewContent, wikiLinkMap)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
