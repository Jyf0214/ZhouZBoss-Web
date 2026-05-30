import { getContentFile, getAllSlugs, getContentIndexes } from '@/lib/content';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export const dynamic = 'force-dynamic';

function isPrivateSlug(slug: string): boolean {
  const indexes = getContentIndexes('posts');
  const dirSlug = '/' + slug.split('/').filter(Boolean).slice(0, -1).join('/');
  const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
  return dirIndex ? !dirIndex.public : false;
}

export function generateStaticParams() {
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
    description: file.meta.description ?? file.content.slice(0, 160),
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');

  if (isPrivateSlug(fullPath)) {
    const session = await getSession();
    if (!session) {
      redirect(`/login?callbackUrl=/posts${fullPath}`);
    }
  }

  const file = getContentFile('posts', fullPath);
  if (!file) notFound();

  const appConfig = loadConfig();

  const breadcrumbs = slug.map((segment, index) => ({
    label: segment,
    href: '/posts/' + slug.slice(0, index + 1).join('/'),
    isLast: index === slug.length - 1,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-8 pb-16">
        {/* 面包屑 */}
        <nav className="flex items-center gap-1.5 text-sm text-zinc-400 mb-10 flex-wrap">
          <Link href="/posts" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5 text-zinc-500">
            <ArrowLeft size={14} />
            <span className="font-medium">{t_posts('title')}</span>
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <span className="text-zinc-300">/</span>
              {crumb.isLast ? (
                <span className="text-zinc-900 font-semibold max-w-[200px] truncate">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-zinc-900 transition-colors font-medium">
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
              <div className="flex flex-wrap gap-2 mb-5">
                {file.meta.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-4xl md:text-[3.5rem] font-black tracking-tight text-zinc-900 mb-8 leading-[1.1]">
              {file.meta.title}
            </h1>
            {(file.meta.author !== undefined || file.meta.date !== undefined) && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {file.meta.author && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-zinc-500">{file.meta.author.charAt(0)}</span>
                    </div>
                    <span className="font-semibold text-zinc-700">{file.meta.author}</span>
                  </div>
                )}
                {file.meta.date && (
                  <time className="text-zinc-400">
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

          {/* 分割线 */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent mb-12" />

          {/* 文章内容 */}
          <div>
            <MarkdownRenderer content={file.content} highlight={appConfig.highlight} />
          </div>
        </article>

        {/* 底部导航 */}
        <div className="mt-20 pt-8 border-t border-zinc-100">
          <Link
            href="/posts"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t_posts('backToPosts')}
          </Link>
        </div>
      </main>
    </div>
  );
}

function t_posts(key: string): string {
  const map: Record<string, string> = {
    title: '帖子',
    backToPosts: '返回帖子列表',
  };
  return map[key] ?? key;
}
