'use client';

import { motion } from 'motion/react';
import type { PostItem, CoverConfig } from './types';
import { PostCardCover } from './PostCardCover';
import { PostCardBody } from './PostCardBody';

export function PostCard({
  post,
  coverConfig,
  defaultCover,
  t,
  locale,
}: {
  post: PostItem;
  coverConfig?: CoverConfig;
  defaultCover?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  const isSide = coverConfig?.position === 'left' || coverConfig?.position === 'right';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group bg-white rounded-[2rem] border-2 border-zinc-50 overflow-hidden hover:border-zinc-900 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-zinc-100 ${isSide ? 'flex' : 'flex flex-col'}`}
    >
      <PostCardCover post={post} coverConfig={coverConfig} defaultCover={defaultCover} />
      <PostCardBody post={post} t={t} locale={locale} />
    </motion.div>
  );
}
