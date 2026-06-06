import { getContentFiles, getContentIndexes } from '@/lib/content';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { ArrowLeft, Hash } from 'lucide-react';
import type { Metadata } from 'next';
import { Tag } from '@/components/ui/Tag';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export function generateStaticParams() {
  const files = getContentFiles('posts');
  const tags = new Set<string>();
  for (const file of files) {
    for (const tag of (file.meta.tags ?? [])) {
      tags.add(tag);
    }
  }
  return Array.from(tags).map(tag => ({ tag }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `标签: ${tag} - Originium Kernel`,
    description: `所有标记为「${tag}」的帖子`,
  };
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;

  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅展示 public 的帖子
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
    return dirIndex ? dirIndex.public : true;
  });

  // 筛选出包含指定标签的帖子
  const taggedPosts = publicFiles.filter((file) =>
    file.meta.tags?.includes(tag)
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        {/* 返回链接 */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          <span>所有帖子</span>
        </Link>

        {/* 页面头部 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center">
            <Hash size={20} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900">
            {tag}
          </h1>
        </div>
        <p className="text-zinc-400 text-lg mb-12">
          共 {taggedPosts.length} 篇帖子
        </p>

        {/* 帖子网格 */}
        {taggedPosts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {taggedPosts.map((post) => (
              <article
                key={post.slug}
                className="group bg-white rounded-3xl border border-zinc-100 overflow-hidden hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-100/80 transition-all duration-500 flex flex-col"
              >
                <div className="px-5 py-4 flex-1 flex flex-col">
                  {/* 标签 */}
                  {post.meta.tags && post.meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.meta.tags.map((t) => (
                        <Link
                          key={t}
                          href={`/tags/${encodeURIComponent(t)}`}
                        >
                          <Tag
                            variant={t === tag ? 'dark' : 'light'}
                            size="md"
                          >
                            {t}
                          </Tag>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* 标题 */}
                  <Link href={`/posts${post.slug}`} className="block group/title">
                    <h2 className="text-lg font-bold text-zinc-900 mb-2 line-clamp-2 leading-snug group-hover/title:text-zinc-600 transition-colors duration-200">
                      {post.meta.title}
                    </h2>
                  </Link>

                  {/* 描述 */}
                  {post.meta.description && (
                    <p className="text-zinc-400 text-sm line-clamp-2 mb-3 leading-relaxed">
                      {post.meta.description}
                    </p>
                  )}

                  {/* 底部信息 */}
                  <div className="mt-auto pt-3 border-t border-zinc-50 flex items-center justify-between">
                    {post.meta.date && (
                      <time className="text-xs text-zinc-400">
                        {new Date(post.meta.date).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* 空状态 */
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Hash size={32} className="text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">暂无帖子</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              没有找到包含标签「{tag}」的帖子
            </p>
          </div>
        )}

        {/* 底部导航 */}
        <div className="mt-16 pt-8 border-t border-zinc-100">
          <Link
            href="/posts"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            返回帖子列表
          </Link>
        </div>
      </main>
    </div>
  );
}
