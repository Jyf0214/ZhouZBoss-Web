'use client';

import { Calendar, Tag as TagIcon, Code, Eye } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import type { ArticleData, UserInfo, PostMetaPostConfig } from './types';

function TagsSection({ tags, show }: { tags?: string[]; show: boolean }) {
  if (!show || !tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {tags.map((tag: string) => (
        <Tag key={tag} variant="light" size="md" className="flex items-center gap-1.5">
          <TagIcon size={12} />
          {tag}
        </Tag>
      ))}
    </div>
  );
}

function DateSection({ displayDate }: { displayDate: string | null }) {
  if (!displayDate) return null;
  return (
    <>
      <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <Calendar size={18} />
        <time className="text-sm font-bold text-zinc-500">{displayDate}</time>
      </div>
    </>
  );
}

function SudoActions({ showRaw, rawContent, onToggleRaw }: {
  showRaw: boolean; rawContent: string; onToggleRaw: () => void;
}) {
  if (!rawContent) return null;
  return (
    <>
      <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>
      <Button
        variant="ghost"
        onClick={onToggleRaw}
        className="hover:text-zinc-900"
        autoLoading={false}
      >
        {showRaw ? <Eye size={18} /> : <Code size={18} />}
        <span className="font-bold">{showRaw ? '预览渲染' : '查看原始文件'}</span>
      </Button>
    </>
  );
}

function ArticleLabelBadge({ postMeta, category }: {
  postMeta?: PostMetaPostConfig;
  category?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {postMeta?.label && (
        <Tag variant="dark" size="sm">
          文章
        </Tag>
      )}
      {postMeta?.unread && (
        <Tag size="xs" variant="danger" className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          未读
        </Tag>
      )}
      {postMeta?.categories && category && (
        <Tag variant="light" size="sm">
          {category}
        </Tag>
      )}
    </div>
  );
}

export function ArticleHeader({
  articleData,
  userData,
  username,
  isSudo,
  showRaw,
  rawContent,
  onToggleRaw,
  postMeta,
}: {
  articleData: ArticleData;
  userData: UserInfo | null;
  username: string;
  isSudo: boolean;
  showRaw: boolean;
  rawContent: string;
  onToggleRaw: () => void;
  postMeta?: PostMetaPostConfig;
}) {
  const dateType = postMeta?.dateType ?? 'both';
  const dateFormat = postMeta?.dateFormat ?? 'date';
  const showTags = postMeta?.tags !== false;

  const dateOptions: Intl.DateTimeFormatOptions = dateFormat === 'simple'
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  const displayDate = dateType === 'none' ? null : new Date(articleData.createdAt).toLocaleDateString('zh-CN', dateOptions);

  return (
    <header className="mb-12">
      <ArticleLabelBadge postMeta={postMeta} category={articleData.category} />
      <TagsSection tags={articleData.tags} show={showTags} />

      <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-zinc-900 mb-10 leading-[1.05]">
        {articleData.title}
      </h1>

      <div className="flex flex-wrap items-center gap-6 text-zinc-400 border-y border-zinc-100 py-8">
        <div className="flex items-center gap-3">
          <Avatar name={articleData.authorName} avatarUrl={userData?.avatar ?? undefined} size={48} />
          <div>
            <div className="font-black text-zinc-900 leading-none mb-1">{articleData.authorName}</div>
            <Tag size="xs" variant="outline">@{username}</Tag>
          </div>
        </div>

        <DateSection displayDate={displayDate} />
        {isSudo && <SudoActions showRaw={showRaw} rawContent={rawContent} onToggleRaw={onToggleRaw} />}
      </div>
    </header>
  );
}
