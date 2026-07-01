'use client';

import { useState } from 'react';
import { ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { BacklinkPanel } from '@/components/BacklinkPanel';
import { Giscus } from '@/components/Comments/Giscus';
import { CopyrightNotice } from '@/components/ui/CopyrightNotice';
import ShareButtons from '@/components/ui/ShareButtons';
import QRCodeDialog from '@/components/ui/QRCodeDialog';
import { ReadingProgressBar } from '@/components/ui/ReadingProgressBar';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { PostBreadcrumb, type Crumb } from './PostBreadcrumb';
import { PostHeader } from './PostHeader';
import { PostRelated } from './PostRelated';
import { PostAdjacent } from './PostAdjacent';
import { PostNavigationShortcuts } from '@/components/PostNavigationShortcuts';
import { TranslationSwitcher } from '@/components/TranslationSwitcher';
import type { RelatedPost } from '../_lib/related-posts';
import type { FrontendConfig } from '@/hooks/use-config';
import type { WikiLinkMap } from '@/components/MarkdownRenderer/types';
import type { BacklinkInfo, RegistryEntry } from '@/lib/content-registry';
import { buildCopyrightConfig, buildShareConfig } from '../_lib/post-page-config';
import { tPosts } from '../_lib/post-i18n';
import { useI18n } from '@/hooks/use-i18n';

export function PostDetailBody({
  file,
  fullPath,
  fullUrl,
  relatedPosts,
  adjacentPosts,
  breadcrumbs,
  wordCount,
  readingTime,
  showWordCount,
  highlight,
  appConfig,
  wikiLinkMap,
  backlinks,
  outgoingRefs,
  translations,
}: {
  file: { content: string; meta: Record<string, unknown> };
  fullPath: string;
  fullUrl: string;
  relatedPosts: RelatedPost[];
  adjacentPosts: { prev?: { slug: string; title: string } | null; next?: { slug: string; title: string } | null };
  breadcrumbs: Crumb[];
  wordCount: number;
  readingTime: number;
  showWordCount: boolean;
  highlight: FrontendConfig['highlight'];
  appConfig: FrontendConfig;
  wikiLinkMap?: WikiLinkMap;
  backlinks?: BacklinkInfo[];
  outgoingRefs?: RegistryEntry[];
  translations?: Record<string, string>;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <ReadingProgressBar />
      <ScrollToTop />
      <PostNavigationShortcuts
        prevSlug={adjacentPosts.prev?.slug ?? null}
        nextSlug={adjacentPosts.next?.slug ?? null}
      />
      <div className="flex-1 min-w-0 max-w-3xl">
      <PostBreadcrumb slug={fullPath} crumbs={breadcrumbs} t={tPosts} />

      <article>
        <PostHeader
          type={file.meta.type}
          tags={file.meta.tags}
          title={file.meta.title}
          author={file.meta.author}
          date={file.meta.date}
          cover={file.meta.cover}
        />

        {/* 多语言版本切换 */}
        {translations && Object.keys(translations).length > 0 && (
          <TranslationSwitcher
            slug={fullPath}
            initialTranslations={translations}
            className="mb-6"
          />
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent mb-12" />

        <div>
          <MarkdownRenderer content={file.content} highlight={highlight} wikiLinkMap={wikiLinkMap} />
        </div>

        {/* 关联引用面板 */}
        <BacklinkPanel
          section="posts"
          slug={fullPath}
          initialBacklinks={backlinks}
          initialOutgoing={outgoingRefs}
        />
      </article>

      <div className="mt-12 max-w-3xl">
        <Giscus slug={fullPath} />
      </div>

      {showWordCount && (
        <div className="mt-12 px-6 py-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            <span>{t('posts.wordCountLabel', { count: wordCount.toLocaleString() })}</span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>
            <span>{t('posts.readingTimeLabel', { minutes: readingTime })}</span>
          </div>
        </div>
      )}

      <div className="mt-12">
        <CopyrightNotice
          author={(file.meta.author as string | undefined) ?? (appConfig.footer?.owner as { author?: string } | undefined)?.author ?? ''}
          title={file.meta.title as string}
          slug={fullPath}
          type={file.meta.type as 'original' | 'reprint' | undefined}
          config={buildCopyrightConfig(appConfig)}
        />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <ShareButtons
          title={file.meta.title as string}
          url={fullUrl}
          config={buildShareConfig(appConfig)}
        />
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors text-sm text-zinc-600 dark:text-zinc-300"
          title="分享二维码"
        >
          <QrCode size={16} />
          二维码
        </button>
      </div>

      <QRCodeDialog
        open={qrOpen}
        url={fullUrl}
        title={file.meta.title as string}
        onClose={() => setQrOpen(false)}
      />

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
