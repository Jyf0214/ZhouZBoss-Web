import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getContentFile, getContentFiles, getContentIndexes, filterPublicFiles, getAllSlugs, getAdjacentPosts } from '@/lib/content';
import { buildWikiLinkMap, getBacklinks, getOutgoingReferences } from '@/lib/content-registry';
import { computeTotalWordCount } from '@/lib/content-stats';
import { loadConfig, canAccess, filterAccessibleSlugs } from '@/lib/config';
import { getAuthorByName } from '@/lib/authors';
import { getSiteUrl } from '@/lib/site-url';
import { parseEncryptedArticle } from '@/lib/article-crypto';
import { hasDatabase } from '@/lib/db';
import { getSession } from '@/lib/auth';

import { isPrivateSlug } from './_lib/post-utils';
import { getRelatedPosts } from './_lib/related-posts';
import { buildTocConfig, computeWordStats } from './_lib/post-page-config';
import { renderMarkdownToHtml } from '@/lib/markdown-render';
import { PostDetailBody } from './_components/PostDetailBody';
import { PostCoverSection } from './_components/PostCoverSection';
import { PostSidebarTrigger, PostSidebarDesktop } from './_components/PostSidebar';
import { JsonLd } from '@/components/JsonLd';
import { getTranslate } from '@/i18n/translate';
import { PostPageProvider } from '@/contexts/PostPageContext';
import type { Crumb } from './_components/PostBreadcrumb';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

/**
 * 静态导出构建标记：output: export 模式禁止调用 cookies()，
 * 构建期一律按"未登录"处理（私有文章已由 generateStaticParams 过滤）
 */
const isStaticExportBuild = process.env.NEXT_STATIC_EXPORT === 'true' || process.env.GITHUB_PAGES === 'true';

// 静态导出模式：所有公开文章预渲染为静态 HTML
// 私有文章（目录级 index.md public:false 或 config access 规则私有）不预渲染，访问返回 404

export async function generateStaticParams() {
  const slugs = getAllSlugs('posts');
  // 目录级私有过滤后，再按 config access 规则过滤（构建期 hasDb=false，
  // 规则私有文章同样排除，避免明文 HTML 进入构建产物）
  const publicSlugs = await filterAccessibleSlugs(
    'posts',
    slugs.filter((slug) => !isPrivateSlug(slug)),
    false,
  );
  return publicSlugs.map((slug) => ({ slug: slug.slice(1).split('/') }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const file = getContentFile('posts', fullPath);
  if (!file) return { title: getTranslate('posts.notFound') };

  // 私有文章（config access 规则或目录级私有）不输出 description，
  // 避免正文摘要经 metadata 泄露
  const hasDb = hasDatabase();
  const isAuthed = hasDb && !isStaticExportBuild ? !!(await getSession()) : false;
  const accessible = await canAccess('posts', fullPath, isAuthed, hasDb);
  if (!accessible) {
    return { title: getTranslate('posts.notFound') };
  }

  return {
    title: `${file.meta.title} - Originium Kernel`,
    description: file.meta.description ?? file.content.slice(0, 160),
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');

  const file = getContentFile('posts', fullPath);
  if (!file) notFound();

  // 权限检查：config access 规则判定不可访问时拒绝（服务器模式需登录，
  // 静态导出构建时 hasDb=false，规则私有文章不会被预渲染）
  const hasDb = hasDatabase();
  const isAuthed = hasDb && !isStaticExportBuild ? !!(await getSession()) : false;
  const accessible = await canAccess('posts', fullPath, isAuthed, hasDb);
  if (!accessible) notFound();

  const viewModel = await buildViewModel(slug, fullPath, file.content, file.meta);

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* 固定背景画布层 — 滚动时背景不动，营造"锚定感" */}
      <div className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-900" aria-hidden="true" />
      <JsonLd
        title={file.meta.title}
        description={file.meta.description}
        datePublished={file.meta.date}
        author={file.meta.author}
        tags={file.meta.tags}
        slug={fullPath}
        wordCount={viewModel.wordCount}
      />
      {/* 全屏宽封面 — 所有帖子统一渲染，无 cover 时用渐变背景 */}
      <PostCoverSection
        title={file.meta.title}
        author={file.meta.author}
        date={file.meta.date}
        updated={file.meta.updated}
        type={file.meta.type}
        tags={file.meta.tags}
        cover={file.meta.cover}
        authorInfo={viewModel.authorInfo}
      />
      <main className="flex-1 max-w-6xl 2xl:max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="lg:flex lg:gap-8 items-start">
          <div className="flex-1 min-w-0">
            {/* 移动端目录按钮 — 在文章内容之前 */}
            <PostSidebarTrigger
              content={file.content}
              headingCount={viewModel.headingCount}
              tocConfig={viewModel.tocConfig}
            />
            <PostPageProvider>
              <PostDetailBody {...viewModel} />
            </PostPageProvider>
          </div>
          <div className="animate-sidebar-slidein">
            <PostSidebarDesktop
              content={file.content}
              headingCount={viewModel.headingCount}
              tocConfig={viewModel.tocConfig}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

async function buildViewModel(
  slug: string[],
  fullPath: string,
  content: string,
  meta: Record<string, unknown>,
) {
  const appConfig = await loadConfig();
  // 文章加密标记：frontmatter 的 password 字段（SHA-256 哈希）仅用于服务端判定是否加密，
  // 哈希值本身不下发到客户端——密码正确性由 AES-GCM 认证标签在解密时判定，
  // 避免无盐快速哈希随页面泄露构成离线爆破旁路
  const passwordHash = typeof meta.password === 'string' ? meta.password : '';
  // 识别并解析密文参数（正文为 aes_gcm:v2: 前缀即密文）
  const encryptedPayload = parseEncryptedArticle(content);
  // 有密码标记但正文未加密（旧格式遗留）时也按加密处理，避免明文外泄
  const isEncrypted = !!passwordHash;

  // 加密文章：正文不下发、不预渲染 HTML（密文仅用于客户端解密），字数统计无从计算
  const stats = isEncrypted
    ? { wordCount: 0, readingTime: 0, headingCount: 0 }
    : computeWordStats(content);
  const tocConfig = buildTocConfig(appConfig);
  const wikiLinkMap = await buildWikiLinkMap();

  // 构建时预渲染 Markdown → HTML（使 curl / AI 爬虫可获取完整正文）
  // highlight 配置控制代码块：语言徽章 / 复制 / 折叠 / 换行 / 主题
  // 加密文章跳过渲染，正文改由客户端验证密码后解密渲染
  const htmlContent = isEncrypted
    ? ''
    : await renderMarkdownToHtml(content, { wikiLinkMap, highlight: appConfig.highlight });
  const backlinks = getBacklinks('posts', fullPath);
  const outgoingRefs = getOutgoingReferences('posts', fullPath);
  const authorName = typeof meta.author === 'string' ? meta.author : '';
  const authorInfo = getAuthorByName(authorName);

  // 文章隐藏：读取 frontmatter 中的 hidden 字段
  const isHidden = meta.hidden === true;

  // 系列文章导航：读取 frontmatter 中的 series 字段
  const seriesName = typeof meta.series === 'string' ? meta.series : '';
  let seriesInfo: { seriesName: string; posts: { slug: string; title: string; isCurrent: boolean }[] } | undefined;
  if (seriesName) {
    const indexes = getContentIndexes('posts');
    const allFiles = filterPublicFiles(getContentFiles('posts'), indexes);
    const seriesPosts = allFiles
      .filter((f) => typeof f.meta.series === 'string' && f.meta.series === seriesName)
      .sort((a, b) => {
        // 按日期升序排列（系列内从旧到新）
        const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
        const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
        return dateA - dateB;
      })
      .map((f) => ({
        slug: f.slug,
        title: f.meta.title,
        isCurrent: f.slug === fullPath,
      }));
    seriesInfo = { seriesName, posts: seriesPosts };
  }

  return {
    file: { content, meta },
    fullPath,
    fullUrl: `${getSiteUrl()}/posts${fullPath}`,
    relatedPosts: getRelatedPosts(fullPath, (meta.tags as string[] | undefined) ?? []),
    adjacentPosts: getAdjacentPosts(fullPath),
    breadcrumbs: buildBreadcrumbs(slug),
    wordCount: stats.wordCount,
    readingTime: stats.readingTime,
    totalWordCount: computeTotalWordCount(),
    headingCount: stats.headingCount,
    wordcount: appConfig.wordcount,
    tocConfig,
    appConfig,
    wikiLinkMap,
    htmlContent,
    backlinks,
    outgoingRefs,
    authorInfo,
    isEncrypted,
    isHidden,
    encryptedPayload,
    // 多语言翻译映射（从 frontmatter translations 字段读取）
    translations: (meta.translations && typeof meta.translations === 'object')
      ? meta.translations as Record<string, string>
      : undefined,
    // 系列文章导航信息
    seriesInfo,
  };
}

function buildBreadcrumbs(slug: string[]): Crumb[] {
  return slug.map((segment, index) => {
    const fullPath = '/posts/' + slug.slice(0, index + 1).join('/');
    const file = getContentFile('posts', '/' + slug.slice(0, index + 1).join('/'));
    return {
      label: file?.meta.title ?? segment,
      href: fullPath,
      isLast: index === slug.length - 1,
    };
  });
}
