import { getContentFile, getAllSlugs, getContentIndexes } from '@/lib/content';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

/** 判断 slug 所在目录是否为 private */
function isPrivateSlug(slug: string): boolean {
  const indexes = getContentIndexes('posts');
  const dirSlug = '/' + slug.split('/').filter(Boolean).slice(0, -1).join('/');
  const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
  return dirIndex ? dirIndex.public === false : false;
}

/** 静态生成仅包含公开内容 */
export async function generateStaticParams() {
  const slugs = getAllSlugs('posts');
  return slugs
    .filter((slug) => !isPrivateSlug(slug))
    .map((slug) => ({
      slug: slug.slice(1).split('/'),
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const file = getContentFile('posts', fullPath);
  if (!file) return { title: '未找到' };
  return {
    title: `${file.meta.title} - Originium Kernel`,
    description: file.meta.description || file.content.slice(0, 160),
  };
}

/**
 * 帖子详情页 — 纯文件系统读取
 * private 内容需要登录（cookie 判断），不查数据库
 */
export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');

  // 访问控制：private 内容需要登录
  if (isPrivateSlug(fullPath)) {
    const session = await getSession();
    if (!session) {
      redirect(`/login?callbackUrl=/posts${fullPath}`);
    }
  }

  const file = getContentFile('posts', fullPath);
  if (!file) notFound();

  // 面包屑导航
  const breadcrumbs = slug.map((segment, index) => ({
    label: segment,
    href: '/posts/' + slug.slice(0, index + 1).join('/'),
    isLast: index === slug.length - 1,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8 flex-wrap">
          <Link href="/posts" className="hover:text-zinc-900 transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> 帖子
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-2">
              <span>/</span>
              {crumb.isLast ? (
                <span className="text-zinc-900 font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-zinc-900 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* 文章头部 */}
        <article>
          <header className="mb-12">
            {file.meta.tags && file.meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {file.meta.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-full border border-zinc-100">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-zinc-900 mb-6 leading-[1.05]">
              {file.meta.title}
            </h1>
            {(file.meta.author || file.meta.date) && (
              <div className="flex flex-wrap items-center gap-6 text-zinc-400 border-y border-zinc-100 py-6">
                {file.meta.author && (
                  <span className="font-medium text-zinc-600">{file.meta.author}</span>
                )}
                {file.meta.date && (
                  <time className="text-sm">
                    {new Date(file.meta.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
              </div>
            )}
          </header>

          {/* 文章内容 */}
          <div className="max-w-3xl mx-auto">
            <MarkdownRenderer content={file.content} />
          </div>
        </article>
      </main>
      <footer className="border-t border-zinc-100 py-12 bg-zinc-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-400 text-sm font-medium">Published with Originium Kernel</p>
        </div>
      </footer>
    </div>
  );
}
