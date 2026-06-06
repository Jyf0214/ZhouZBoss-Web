import { getContentFile, getAllSlugs, getContentIndexes, getContentFiles, getAdjacentPosts } from '@/lib/content';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { TOC } from '@/components/ui/TOC';
import { CopyrightNotice } from '@/components/ui/CopyrightNotice';
import ShareButtons from '@/components/ui/ShareButtons';
import { SITE_URL } from '@/const/url';
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

// eslint-disable-next-line complexity
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

  // 字数统计
  const wordCount = file.content.length;
  const readingTime = Math.ceil(wordCount / 500);
  const showWordCount = appConfig.wordcount?.enable === true;

  // 标题统计（用于判断是否显示 TOC）
  const headingCount = (file.content.match(/^#{2,4}\s+.+$/gm) ?? []).length;

  // 完整 URL（用于分享按钮）
  const fullUrl = `${SITE_URL}/posts${fullPath}`;

  // TOC 配置
  const tocConfig = {
    enabled: appConfig.toc?.post ?? false,
    number: appConfig.toc?.number ?? true,
    expand: appConfig.toc?.expand ?? false,
    styleSimple: appConfig.toc?.styleSimple ?? false,
  };

  // 分享配置：将逗号分隔的 sites 字符串转为数组
  const sitesStr = appConfig.share?.sharejs?.sites;
  const sites = sitesStr ? sitesStr.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  // 相关文章
  const pubIndexes = getContentIndexes('posts');
  const allPublicFiles = getContentFiles('posts').filter((f) => {
    const dirSlug = '/' + f.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = pubIndexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });
  const relatedPosts = allPublicFiles
    .filter((f) => f.slug !== fullPath)
    .map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      sharedTags: (f.meta.tags ?? []).filter((t) => (file.meta.tags ?? []).includes(t)).length,
    }))
    .filter((f) => f.sharedTags > 0)
    .sort((a, b) => b.sharedTags - a.sharedTags)
    .slice(0, 4);

  // 上下篇导航
  const adjacentPosts = getAdjacentPosts(fullPath);

  const breadcrumbs = slug.map((segment, index) => ({
    label: segment,
    href: '/posts/' + slug.slice(0, index + 1).join('/'),
    isLast: index === slug.length - 1,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-16">
        <div className="lg:flex lg:gap-12">
          <div className="flex-1 min-w-0 max-w-3xl">
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
            {/* 原创/转载标识 */}
            {(file.meta.type === 'original' || file.meta.type === 'reprint') && (
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                  file.meta.type === 'original'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {file.meta.type === 'original' ? '原创' : '转载'}
                </span>
              </div>
            )}
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

        {/* 字数统计 */}
        {showWordCount && (
          <div className="mt-12 px-6 py-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="text-sm text-zinc-500 text-center">
              <span>本文字数: {wordCount.toLocaleString()} 字</span>
              <span className="mx-2 text-zinc-300">|</span>
              <span>预计阅读: {readingTime} 分钟</span>
            </div>
          </div>
        )}

        {/* 版权声明 */}
        <div className="mt-12">
          <CopyrightNotice
            author={file.meta.author ?? appConfig.footer?.owner?.author ?? ''}
            title={file.meta.title}
            slug={fullPath}
            type={file.meta.type as 'original' | 'reprint' | undefined}
            config={{
              enable: appConfig.copyright?.enable ?? true,
              license: appConfig.copyright?.license ?? 'CC BY-NC-SA 4.0',
              licenseUrl: appConfig.copyright?.licenseUrl ?? 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
              authorLink: appConfig.copyright?.authorLink ?? '/',
              authorImgFront: appConfig.copyright?.authorImgFront,
              location: appConfig.copyright?.location,
              decode: appConfig.copyright?.decode,
            }}
          />
        </div>

        {/* 分享按钮 */}
        <div className="mt-8">
          <ShareButtons
            title={file.meta.title}
            url={fullUrl}
            config={{
              enable: appConfig.share?.sharejs?.enable ?? false,
              sites: sites,
            }}
          />
        </div>

        {/* 相关文章 */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">相关文章</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={post.slug}
                  className="group p-4 rounded-xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-900 transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  {post.date && (
                    <time className="text-xs text-zinc-400">
                      {new Date(post.date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 底部导航 */}
        <div className="mt-20 pt-8 border-t border-zinc-100">
          {/* 上下篇导航 */}
          {(adjacentPosts.prev ?? adjacentPosts.next) && (
            <div className="flex justify-between gap-4 mb-8">
              {adjacentPosts.prev ? (
                <Link
                  href={adjacentPosts.prev.slug}
                  className="group flex-1 flex flex-col p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors min-w-0"
                >
                  <span className="text-xs text-zinc-400 mb-1">← 上一篇</span>
                  <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors truncate">
                    {adjacentPosts.prev.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {adjacentPosts.next ? (
                <Link
                  href={adjacentPosts.next.slug}
                  className="group flex-1 flex flex-col p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors min-w-0 text-right"
                >
                  <span className="text-xs text-zinc-400 mb-1">下一篇 →</span>
                  <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors truncate">
                    {adjacentPosts.next.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          )}

          <Link
            href="/posts"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t_posts('backToPosts')}
          </Link>
        </div>
      </div>

        {/* TOC 侧边栏 — 桌面端 */}
        {tocConfig.enabled && headingCount >= 3 && (
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <TOC
                content={file.content}
                config={{
                  number: appConfig.toc?.number ?? true,
                  expand: appConfig.toc?.expand ?? false,
                  styleSimple: appConfig.toc?.styleSimple ?? false,
                }}
              />
            </div>
          </aside>
        )}
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
