import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getContentFile, getAllSlugs, getAdjacentPosts } from '@/lib/content';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import { getSiteUrl } from '@/const/url';

import { isPrivateSlug } from './_lib/post-utils';
import { getRelatedPosts } from './_lib/related-posts';
import { buildTocConfig, computeWordStats } from './_lib/post-page-config';
import { PostDetailBody } from './_components/PostDetailBody';
import { PostSidebar } from './_components/PostSidebar';
import type { Crumb } from './_components/PostBreadcrumb';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// 公开文章使用 ISR（增量静态再生），每 600 秒（10 分钟）重新验证一次
// 私有文章不在 generateStaticParams 中，运行时由 getSession() → cookies() 触发动态渲染
export const revalidate = 600;

export function generateStaticParams() {
  const slugs = getAllSlugs('posts');
  return slugs
    .filter((slug) => !isPrivateSlug(slug))
    .map((slug) => ({ slug: slug.slice(1).split('/') }));
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

  await enforceAccess(fullPath);

  const file = getContentFile('posts', fullPath);
  if (!file) notFound();

  const viewModel = buildViewModel(slug, fullPath, file.content, file.meta);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-16">
        <div className="lg:flex lg:gap-12">
          <PostDetailBody {...viewModel} />
          <PostSidebar
            content={file.content}
            headingCount={viewModel.headingCount}
            tocConfig={viewModel.tocConfig}
          />
        </div>
      </main>
    </div>
  );
}

async function enforceAccess(fullPath: string): Promise<void> {
  if (!isPrivateSlug(fullPath)) return;
  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=/posts${fullPath}`);
  }
}

function buildViewModel(
  slug: string[],
  fullPath: string,
  content: string,
  meta: Record<string, unknown>,
) {
  const appConfig = loadConfig();
  const stats = computeWordStats(content);
  const tocConfig = buildTocConfig(appConfig);

  return {
    file: { content, meta },
    fullPath,
    fullUrl: `${getSiteUrl()}/posts${fullPath}`,
    relatedPosts: getRelatedPosts(fullPath, (meta.tags as string[] | undefined) ?? []),
    adjacentPosts: getAdjacentPosts(fullPath),
    breadcrumbs: buildBreadcrumbs(slug),
    wordCount: stats.wordCount,
    readingTime: stats.readingTime,
    headingCount: stats.headingCount,
    showWordCount: appConfig.wordcount?.enable ?? false,
    highlight: appConfig.highlight,
    tocConfig,
    appConfig,
  };
}

function buildBreadcrumbs(slug: string[]): Crumb[] {
  return slug.map((segment, index) => ({
    label: segment,
    href: '/posts/' + slug.slice(0, index + 1).join('/'),
    isLast: index === slug.length - 1,
  }));
}
