'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import { ClientEnhancer } from '@/components/MarkdownRenderer/ClientEnhancer';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArticleEncryption } from '@/components/ArticleEncryption';
import type { ArticleCryptoPayload } from '@/lib/article-crypto';
import { ReadingProgressBar } from '@/components/ui/ReadingProgressBar';
import { ContinueReadingPrompt } from '@/components/ui/ContinueReadingPrompt';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { Tag } from '@/components/ui/Tag';
import { SeriesNavigation } from '@/components/SeriesNavigation';
import { PostBreadcrumb, type Crumb } from './PostBreadcrumb';
import { PostRelated } from './PostRelated';
import { PostAdjacent } from './PostAdjacent';
import { PostNavigationShortcuts } from '@/components/PostNavigationShortcuts';
import { TranslationSwitcher } from '@/components/TranslationSwitcher';
import { PostSidebarCard } from '@/components/PostSidebarCard';
import { ArticleExpiredBanner } from '@/components/ArticleExpiredBanner';
import { Button } from '@/components/ui/Button';
import { CopyrightNotice } from '@/components/ui/CopyrightNotice';
import ShareButtons from '@/components/ShareButtons';
import QRCodeDialog from '@/components/ui/QRCodeDialog';
import { PostLikeButton } from '@/components/PostLikeButton';
import { Hitokoto } from '@/components/Hitokoto';
import { BacklinkPanel } from '@/components/BacklinkPanel';
import RewardArea from '@/components/RewardArea';
import CopyInterceptor from '@/components/CopyInterceptor';
import PostEditLink from '@/components/PostEditLink';
import { LazyLoad } from '@/components/ui/LazyLoad';
import type { RelatedPost } from '../_lib/related-posts';
import type { FrontendConfig } from '@/hooks/use-config';
import type { WikiLinkMap } from '@/components/MarkdownRenderer/types';
import type { BacklinkInfo, RegistryEntry } from '@/lib/content-registry';
import type { AuthorInfo } from '@/types/author';
import { buildCopyrightConfig } from '../_lib/post-page-config';
import { tPosts } from '../_lib/post-i18n';
import { useI18n } from '@/hooks/use-i18n';
import { useScrollProgress } from '@/hooks/use-scroll-progress';
import { useVisitedPosts } from '@/hooks/use-visited-posts';
import { useSetPostTitle } from '@/contexts/PostPageContext';

// 评论区保留动态加载（需要客户端 OAuth）
const LazyGiscus = dynamic(
  () => import('@/components/Comments/Giscus').then((m) => m.Giscus),
  { ssr: false },
);

// eslint-disable-next-line complexity
export function PostDetailBody({
  file,
  fullPath,
  fullUrl,
  relatedPosts,
  adjacentPosts,
  breadcrumbs,
  wordCount,
  readingTime,
  totalWordCount,
  wordcount,
  appConfig,
  wikiLinkMap: _wikiLinkMap,
  backlinks,
  outgoingRefs,
  translations,
  authorInfo,
  isEncrypted,
  isHidden,
  encryptedPayload,
  seriesInfo,
  htmlContent,
}: {
  file: { content: string; meta: Record<string, unknown> };
  fullPath: string;
  fullUrl: string;
  relatedPosts: RelatedPost[];
  adjacentPosts: { prev?: { slug: string; title: string; cover?: string } | null; next?: { slug: string; title: string; cover?: string } | null };
  breadcrumbs: Crumb[];
  wordCount: number;
  readingTime: number;
  /** 全站公开文章总字数（wordcount.totalWordcount 展示用） */
  totalWordCount: number;
  wordcount: FrontendConfig['wordcount'];
  appConfig: FrontendConfig;
  wikiLinkMap?: WikiLinkMap;
  backlinks?: BacklinkInfo[];
  outgoingRefs?: RegistryEntry[];
  translations?: Record<string, string>;
  authorInfo?: AuthorInfo | null;
  /** 文章是否加密（需要密码才能查看内容） */
  isEncrypted?: boolean;
  /** 文章是否隐藏（不在列表中显示，但可通过 URL 直接访问） */
  isHidden?: boolean;
  /** 加密文章的密文参数（构建时识别，仅下发密文） */
  encryptedPayload?: ArticleCryptoPayload | null;
  /** 系列文章导航信息 */
  seriesInfo?: { seriesName: string; posts: { slug: string; title: string; isCurrent: boolean }[] };
  /** 构建时预渲染的 HTML 内容 */
  htmlContent?: string;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { progress, savedPosition, restorePosition, dismissPosition } = useScrollProgress(fullPath);
  const { markVisited } = useVisitedPosts();
  const titleStr = typeof file.meta.title === 'string' ? file.meta.title : '';
  useSetPostTitle(titleStr);

  // 记录文章已访问（支撑列表页未读标记）
  useEffect(() => {
    markVisited(fullPath);
  }, [markVisited, fullPath]);

  return (
    <>
      <ReadingProgressBar progress={progress} />
      <ContinueReadingPrompt
        savedPosition={savedPosition}
        onRestore={restorePosition}
        onDismiss={dismissPosition}
      />
      <ScrollToTop />
      <PostNavigationShortcuts
        prevSlug={adjacentPosts.prev?.slug ?? null}
        nextSlug={adjacentPosts.next?.slug ?? null}
      />
      <div className="flex-1 min-w-0 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <PostBreadcrumb slug={fullPath} crumbs={breadcrumbs} t={tPosts} />
        <PostEditLink slug={fullPath} />
      </div>

      {/* 文章内容容器 — 卡片样式 */}
      <div className="relative">
      <article className="bg-white dark:bg-zinc-800 rounded-2xl sm:rounded-[2rem] border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm dark:shadow-zinc-900/50 p-6 sm:p-8 md:p-10 lg:p-12 animate-card-slidein">
        {/* 隐藏文章标识 — 仅展示标签 */}
        {isHidden && (
          <div className="mb-6">
            <Tag variant="amber" size="sm">
              {t('posts.hiddenOnly')}
            </Tag>
          </div>
        )}

        {/* 多语言版本切换 */}
        {translations && Object.keys(translations).length > 0 && (
          <TranslationSwitcher
            slug={fullPath}
            initialTranslations={translations}
            className="mb-6"
          />
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent mb-12" />

        {/* 系列文章导航 — 在文章正文前显示 */}
        {seriesInfo && seriesInfo.posts.length > 1 && (
          <SeriesNavigation
            seriesName={seriesInfo.seriesName}
            posts={seriesInfo.posts}
          />
        )}

        {/* 文章过期提示 — 超过180天的文章显示提示横幅 */}
        {typeof file.meta.date === 'string' && (
          <ArticleExpiredBanner date={file.meta.date} slug={fullPath} />
        )}

        <div ref={contentRef}>
          {/* 加密文章：显示密码验证界面；验证成功后解密并用 MarkdownRenderer 渲染 */}
          {isEncrypted && decrypted === null ? (
            <ArticleEncryption
              encryptedPayload={encryptedPayload ?? null}
              onDecrypted={setDecrypted}
            />
          ) : (
            <>
              {decrypted !== null ? (
                <div className="prose prose-zinc dark:prose-invert max-w-none overflow-x-auto
                  prose-headings:tracking-tight prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
                  prose-h2:mt-14 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-zinc-200 dark:prose-h2:border-zinc-700
                  prose-h3:mt-10 prose-h3:mb-4 prose-h3:pl-3 prose-h3:border-l-[3px] prose-h3:border-zinc-900 dark:prose-h3:border-zinc-300
                  prose-h4:mt-8 prose-h4:mb-3 prose-h4:text-zinc-600 dark:prose-h4:text-zinc-400
                  prose-p:leading-[1.7] prose-p:text-[15px]
                  prose-a:font-semibold prose-a:underline prose-a:decoration-zinc-300 dark:prose-a:decoration-zinc-600 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-900 dark:hover:prose-a:decoration-zinc-300
                  prose-strong:font-bold
                  prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.875em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                  prose-blockquote:border-zinc-900 dark:prose-blockquote:border-zinc-400 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800 prose-blockquote:rounded-r-2xl prose-blockquote:py-1 prose-blockquote:not-italic
                  prose-li:text-[15px]
                  prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100 dark:prose-img:border-zinc-700
                  prose-hr:border-zinc-100 dark:prose-hr:border-zinc-700 prose-hr:my-12
                  prose-pre:bg-zinc-50 dark:prose-pre:bg-zinc-900 prose-pre:text-zinc-800 dark:prose-pre:text-zinc-200 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700 prose-pre:rounded-xl prose-pre:shadow-sm"
                >
                  <MarkdownRenderer
                    content={decrypted}
                    highlight={appConfig.highlight}
                    wikiLinkMap={_wikiLinkMap}
                  />
                </div>
              ) : (
                <div
                  className="prose prose-zinc dark:prose-invert max-w-none overflow-x-auto
                  prose-headings:tracking-tight prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
                  prose-h2:mt-14 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-zinc-200 dark:prose-h2:border-zinc-700
                  prose-h3:mt-10 prose-h3:mb-4 prose-h3:pl-3 prose-h3:border-l-[3px] prose-h3:border-zinc-900 dark:prose-h3:border-zinc-300
                  prose-h4:mt-8 prose-h4:mb-3 prose-h4:text-zinc-600 dark:prose-h4:text-zinc-400
                  prose-p:leading-[1.7] prose-p:text-[15px]
                  prose-a:font-semibold prose-a:underline prose-a:decoration-zinc-300 dark:prose-a:decoration-zinc-600 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-900 dark:hover:prose-a:decoration-zinc-300
                  prose-strong:font-bold
                  prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.875em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                  prose-blockquote:border-zinc-900 dark:prose-blockquote:border-zinc-400 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800 prose-blockquote:rounded-r-2xl prose-blockquote:py-1 prose-blockquote:not-italic
                  prose-li:text-[15px]
                  prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100 dark:prose-img:border-zinc-700
                  prose-hr:border-zinc-100 dark:prose-hr:border-zinc-700 prose-hr:my-12
                  prose-pre:bg-zinc-50 dark:prose-pre:bg-zinc-900 prose-pre:text-zinc-800 dark:prose-pre:text-zinc-200 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700 prose-pre:rounded-xl prose-pre:shadow-sm"
                  dangerouslySetInnerHTML={{ __html: htmlContent ?? '' }}
                />
              )}
              <ClientEnhancer containerRef={contentRef} />
            </>
          )}
        </div>

        {/* 关联引用面板 */}
        <BacklinkPanel
          section="posts"
          slug={fullPath}
          initialBacklinks={backlinks}
          initialOutgoing={outgoingRefs}
        />
      </article>

      {/* 复制附加版权 — 监听正文复制事件（超长复制自动附带版权信息） */}
      <CopyInterceptor
        articleRef={contentRef}
        authorName={(file.meta.author as string | undefined) ?? (appConfig.footer?.owner as { author?: string } | undefined)?.author}
        authorInfo={authorInfo}
      />

      {/* 浮动信息卡片 — 桌面端右侧 */}
      <div className="hidden 2xl:block absolute top-0 w-52" style={{ left: 'calc(100% + 1.5rem)' }}>
        <div className="sticky top-24">
          <PostSidebarCard
            authorInfo={authorInfo}
            wordCount={wordCount}
            readingTime={readingTime}
            date={typeof file.meta.date === 'string' ? file.meta.date : undefined}
            tags={Array.isArray(file.meta.tags) ? file.meta.tags : undefined}
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        </div>
      </div>
      </div>

      {/* 作者信息 — 单独容器 */}
      <div className="mt-12">
        <CopyrightNotice
          author={(file.meta.author as string | undefined) ?? (appConfig.footer?.owner as { author?: string } | undefined)?.author ?? ''}
          title={file.meta.title as string}
          slug={fullPath}
          type={file.meta.type as 'original' | 'reprint' | undefined}
          config={buildCopyrightConfig(appConfig)}
          authorInfo={authorInfo}
        />
      </div>

      {/* 分享按钮 + 点赞 — 紧跟作者 */}
      <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
        <ShareButtons
          title={file.meta.title as string}
          url={fullUrl}
          config={appConfig.share ?? null}
        />
        <Button
          variant="secondary"
          size="md"
          autoLoading={false}
          onClick={() => setQrOpen(true)}
          title={t('posts.shareQR')}
          icon={<QrCode size={16} />}
        >
          {t('posts.qrCode')}
        </Button>
        <PostLikeButton slug={fullPath} />
      </div>

      {/* 赞赏 — 配置 reward.enable 且至少一个二维码时显示 */}
      <RewardArea />

      {/* 一言 — 文章底部 */}
      <div className="mt-10">
        <Hitokoto />
      </div>

      <QRCodeDialog
        open={qrOpen}
        url={fullUrl}
        title={file.meta.title as string}
        onClose={() => setQrOpen(false)}
      />

      {/* 评论区 — 滚动到视口附近才挂载（懒加载，避免首屏加载评论脚本） */}
      <LazyLoad className="mt-12 max-w-3xl">
        <LazyGiscus slug={fullPath} />
      </LazyLoad>

      {/* 字数统计 — enable 总开关 + 三子开关分别展示；加密文章不展示（字数无从统计） */}
      {!isEncrypted && (() => {
        const stats = wordcount?.enable === true
          ? [
              wordcount.postWordcount ? t('posts.wordCountLabel', { count: wordCount.toLocaleString() }) : null,
              wordcount.min2read ? t('posts.readingTimeLabel', { minutes: readingTime }) : null,
              wordcount.totalWordcount ? t('posts.totalWordsLabel', { count: totalWordCount.toLocaleString() }) : null,
            ].filter((s): s is string => !!s)
          : [];
        return stats.length > 0 ? (
          <div className="mt-12 px-6 py-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              {stats.map((s, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>}
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      <PostRelated posts={relatedPosts} />

      <div className="mt-20 pt-8 border-t border-zinc-100 dark:border-zinc-700">
        <PostAdjacent prev={adjacentPosts.prev ?? null} next={adjacentPosts.next ?? null} />

        <Link
          href="/posts"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {tPosts('backToPosts')}
        </Link>
      </div>
    </div>
    </>
  );
}
