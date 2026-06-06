'use client';

import Link from 'next/link';
import { Calendar, User } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import type { PostItem } from './types';

function PostListItemFooter({
  post,
  locale,
  t,
}: {
  post: PostItem;
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <div className="mt-auto pt-3 border-t border-zinc-50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-zinc-100 rounded flex items-center justify-center text-zinc-400">
          <User size={10} />
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {post.author ?? t('home.anonymous')}
        </span>
      </div>
      {post.date && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Calendar size={12} />
          <span>
            {new Date(post.date).toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}

export function PostListItemBody({
  post,
  locale,
  t,
}: {
  post: PostItem;
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <div className="px-5 py-4 flex-1 flex flex-col">
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.slice(0, 3).map((tag) => (
            <Tag key={tag} variant="light" size="md">
              {tag}
            </Tag>
          ))}
        </div>
      )}

      <Link href={`/posts${post.slug}`} className="block group/title">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 line-clamp-2 leading-snug group-hover/title:text-zinc-600 transition-colors duration-200">
          {post.title}
        </h2>
      </Link>

      {post.description && (
        <p className="text-zinc-400 text-sm line-clamp-2 mb-3 leading-relaxed">
          {post.description}
        </p>
      )}

      <PostListItemFooter post={post} locale={locale} t={t} />
    </div>
  );
}
