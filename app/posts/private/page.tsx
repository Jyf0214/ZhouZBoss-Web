import { getContentFiles, getContentIndexes } from '@/lib/content';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { PostListClient } from '../PostListClient';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '私人内容 - Originium Kernel',
  description: '仅登录用户可见的私人帖子',
};

/**
 * 私人帖子页 — 需要登录，展示 public: false 的内容
 * 不查数据库，仅通过 cookie 判断登录状态
 */
export default async function PrivatePostsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?callbackUrl=/posts/private');
  }

  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅展示 private 的帖子（目录标记 public: false）
  const privateFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
    return dirIndex ? dirIndex.public === false : false;
  });

  const privateIndexes = indexes.filter((idx) => idx.public === false);

  const posts = privateFiles.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    author: f.meta.author,
    tags: f.meta.tags || [],
    cover: f.meta.cover,
    description: f.meta.description,
  }));

  const groups = privateIndexes.map((idx) => ({
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
          🔒 私人内容
        </h1>
        <p className="text-zinc-400 text-lg mb-12">仅登录用户可见的私人帖子</p>
        <PostListClient posts={posts} groups={groups} />
      </main>
    </div>
  );
}
