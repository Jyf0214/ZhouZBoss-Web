import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { PostListClient } from './PostListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '帖子 - Originium Kernel',
  description: '浏览所有公开帖子',
};

export default async function PostsPage() {
  const config = await loadConfigAsync();
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  const accessibleFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    return canAccess('posts', file.slug, isAuthenticated, dbAvailable, config) &&
      canAccess('posts', dirSlug || '/', isAuthenticated, dbAvailable, config);
  });

  const accessibleIndexes = indexes.filter((idx) => {
    return canAccess('posts', idx.slug, isAuthenticated, dbAvailable, config);
  });

  // 仅传递列表展示所需字段，不传递完整 content 避免序列化问题
  const posts = accessibleFiles.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    author: f.meta.author,
    tags: f.meta.tags || [],
    cover: f.meta.cover,
    description: f.meta.description,
  }));

  const groups = accessibleIndexes.map((idx) => ({
    slug: idx.slug,
    title: idx.title,
    description: idx.description,
    public: idx.public,
    groupName: idx.groupName,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-4">
          {config.site.title}
        </h1>
        <p className="text-zinc-400 text-lg mb-12">{config.site.description}</p>
        <PostListClient posts={posts} groups={groups} />
      </main>
    </div>
  );
}
