import { useState } from 'react';
import { ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
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
import type { RelatedPost } from '../_lib/related-posts';
import type { FrontendConfig } from '@/hooks/use-config';
import { buildCopyrightConfig, buildShareConfig } from '../_lib/post-page-config';
import { tPosts } from '../_lib/post-i18n';

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
}) {
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <>
      <ReadingProgressBar />
      <ScrollToTop />
      <div className="flex-1 min-w-0 max-w-3xl">
      <PostBreadcrumb slug={fullPath} crumbs={breadcrumbs} t={tPosts} />

      <article>
        <PostHeader
          type={file.meta.type}
          tags={file.meta.tags}
          title={file.meta.title}
          author={file.meta.author}
          date={file.meta.date}
        />

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent mb-12" />

        <div>
          <MarkdownRenderer content={file.content} highlight={highlight} />
        </div>
      </article>

      <div className="mt-12 max-w-3xl">
        <Giscus slug={fullPath} />
      </div>

      {showWordCount && (
        <div className="mt-12 px-6 py-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <div className="text-sm text-zinc-500 text-center">
            <span>本文字数: {wordCount.toLocaleString()} 字</span>
            <span className="mx-2 text-zinc-300">|</span>
            <span>预计阅读: {readingTime} 分钟</span>
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
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-sm text-zinc-600"
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

      <div className="mt-20 pt-8 border-t border-zinc-100">
        <PostAdjacent prev={adjacentPosts.prev ?? null} next={adjacentPosts.next ?? null} />

        <Link
          href="/posts"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {tPosts('backToPosts')}
        </Link>
      </div>
    </div>
    </>
  );
}
