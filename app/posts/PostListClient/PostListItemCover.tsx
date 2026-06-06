'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { PostItem, CoverConfig } from './types';

export function PostListItemCover({
  post,
  coverConfig,
}: {
  post: PostItem;
  coverConfig?: CoverConfig;
}) {
  const coverAside = coverConfig?.asideEnable ?? true;
  const coverIndex = coverConfig?.indexEnable ?? true;
  const coverVisible = coverAside && coverIndex;
  const position = coverConfig?.position;
  const isRowLayout = position === 'left' || position === 'right';

  const coverClassMap: Record<string, string> = {
    right: 'order-last w-2/5 shrink-0',
    left: 'w-2/5 shrink-0',
  };
  const coverClassName = coverClassMap[position ?? ''] ?? '';

  if (!coverVisible) return null;

  return (
    <div className={coverClassName}>
      <Link
        href={`/posts${post.slug}`}
        className={`block overflow-hidden bg-zinc-50 relative ${isRowLayout ? 'h-full' : 'aspect-video'}`}
      >
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
            <span className="text-6xl font-black text-zinc-200 select-none group-hover:text-zinc-300 transition-colors duration-500">
              {post.title.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
          <ArrowUpRight size={18} className="text-zinc-900" />
        </div>
      </Link>
    </div>
  );
}
