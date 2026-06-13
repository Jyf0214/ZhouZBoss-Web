import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig } from '@/lib/config';
import { PostListClient } from './PostListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '帖子 - Originium Kernel',
  description: '浏览所有公开帖子',
};

export const revalidate = 300; // 5 分钟 ISR

/**
 * 帖子列表页 — 服务端组件，直接从文件系统读取
 * 仅展示 public 内容，不查数据库
 */
export default function PostsPage() {
  const config = loadConfig();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅展示 public 的帖子
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
    return dirIndex ? dirIndex.public : true;
  });

  const publicIndexes = indexes.filter((idx) => idx.public);

  const posts = publicFiles.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    author: f.meta.author,
    tags: f.meta.tags ?? [],
    cover: f.meta.cover,
    description: f.meta.description,
    pinned: f.meta.pinned === true,
  }));

  const groups = publicIndexes.map((idx) => ({
    slug: idx.slug,
    title: idx.title,
    description: idx.description,
    public: idx.public,
    groupName: idx.groupName,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-4">
          {config.site.title}
        </h1>
        <p className="text-zinc-400 text-lg mb-12">{config.site.description}</p>
        <PostListClient posts={posts} groups={groups} coverConfig={config.cover} />
      </main>
    </div>
  );
}
