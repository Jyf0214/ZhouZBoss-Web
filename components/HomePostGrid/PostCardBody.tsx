import Link from 'next/link';
import { Pin, User as UserIcon, Calendar, Clock } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import type { PostItem } from './types';

export function PostCardBody({
  post,
  t,
  locale,
}: {
  post: PostItem;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  return (
    <div className="px-5 py-4 flex-1 flex flex-col">
      {post.pinned && (
        <div className="inline-flex items-center gap-1.5 mb-3 self-start bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 px-2.5 py-1 rounded-lg">
          <Pin size={10} className="text-amber-400/80" />
          <Tag size="xs" variant="dark">
            {t('home.pinned')}
          </Tag>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(post.tags ?? []).slice(0, 3).map((tag) => (
          <Tag key={tag} variant="light" size="md">
            {tag}
          </Tag>
        ))}
      </div>
      <Link href={`/posts${post.slug}`} className="block group/title">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 leading-snug group-hover/title:text-zinc-600 dark:group-hover/title:text-zinc-300 transition-colors">
          {post.title}
        </h3>
      </Link>
      <p className="text-zinc-400 text-sm line-clamp-2 mb-3 leading-relaxed">
        {post.description ?? ''}
      </p>
      <div className="mt-auto pt-3 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-zinc-100 dark:bg-zinc-700 rounded flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <UserIcon size={10} />
          </div>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {post.author ?? t('home.anonymous')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          {post.readingTime && post.readingTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              <span>阅读 {post.readingTime} 分钟</span>
            </span>
          )}
          {post.date && (
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              <span>
                {new Date(post.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
