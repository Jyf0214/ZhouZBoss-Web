'use client';

import { motion } from 'motion/react';
import type { PostItem, CoverConfig } from './types';
import { PostListItemCover } from './PostListItemCover';
import { PostListItemBody } from './PostListItemBody';

export function PostListItem({
  post,
  index,
  coverConfig,
  locale,
  t,
}: {
  post: PostItem;
  index: number;
  coverConfig?: CoverConfig;
  locale: string;
  t: (key: string) => string;
}) {
  const isRowLayout = coverConfig?.position === 'left' || coverConfig?.position === 'right';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group bg-white rounded-3xl border border-zinc-100 overflow-hidden hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-100/80 transition-all duration-500 ${isRowLayout ? 'flex' : 'flex flex-col'}`}
    >
      <PostListItemCover post={post} coverConfig={coverConfig} />
      <PostListItemBody post={post} locale={locale} t={t} />
    </motion.article>
  );
}
