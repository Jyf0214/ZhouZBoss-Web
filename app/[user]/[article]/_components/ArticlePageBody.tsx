'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import ArticleCopyright from '@/components/ArticleCopyright';
import RewardArea from '@/components/RewardArea';
import AuthorCard from '@/components/AuthorCard';
import PostEditLink from '@/components/PostEditLink';
import TableOfContents from '@/components/TableOfContents';
import CopyInterceptor from '@/components/CopyInterceptor';
import { PageContainer } from '@/components/ui/PageContainer';
import type { FrontendConfig } from '@/hooks/use-config';
import { ArticleHeader } from './ArticleHeader';
import { ArticleCoverImage } from './ArticleCoverImage';
import { ArticleContentSection } from './ArticleContentSection';
import type { ArticleData, UserInfo } from './types';

export function ArticlePageBody({
  articleData,
  userData,
  username,
  isSudo,
  showRaw,
  rawContent,
  articleRef,
  siteConfig,
  mainColor,
  article,
  onToggleRaw,
}: {
  articleData: ArticleData;
  userData: UserInfo | null;
  username: string;
  isSudo: boolean;
  showRaw: boolean;
  rawContent: string;
  articleRef: React.RefObject<HTMLDivElement | null>;
  siteConfig: FrontendConfig | null;
  mainColor: string | null | undefined;
  article: string;
  onToggleRaw: () => void;
}) {
  const shareConfig = siteConfig?.share;
  const showShare = shareConfig && (shareConfig.sharejs.enable || shareConfig.addtoany.enable);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <PageContainer maxWidth="4xl" padding="wide">
        <Link href={`/${username}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-12 transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to {userData?.name}&apos;s Profile</span>
        </Link>

        <article ref={articleRef} style={mainColor ? { '--main-tone': mainColor } as React.CSSProperties : undefined}>
          <ArticleHeader
            articleData={articleData}
            userData={userData}
            username={username}
            isSudo={isSudo}
            showRaw={showRaw}
            rawContent={rawContent}
            onToggleRaw={onToggleRaw}
            postMeta={siteConfig?.postMeta?.post}
          />

          {(() => {
            const coverSrc = articleData.coverImage || siteConfig?.cover?.defaultCover?.[0];
            if (!coverSrc) return null;
            return (
              <ArticleCoverImage
                coverImage={articleData.coverImage}
                title={articleData.title}
                mainColor={mainColor}
                defaultCover={siteConfig?.cover?.defaultCover?.[0]}
                errorFallback={siteConfig?.errorImg?.postPage}
              />
            );
          })()}

          <ArticleContentSection
            showRaw={showRaw}
            rawContent={rawContent}
            content={articleData.content}
            highlight={siteConfig?.highlight}
          />

          <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between">
            <PostEditLink slug={articleData.id || article} />
            {showShare && <ShareButtons config={shareConfig} title={articleData.title} variant="horizontal" />}
          </div>

          <ArticleCopyright authorName={articleData.authorName} />
          <RewardArea />
          <AuthorCard
            authorName={articleData.authorName}
            authorAvatar={userData?.avatar}
            authorUrl={`/${username}`}
          />
        </article>

        <CopyInterceptor articleRef={articleRef} authorName={articleData.authorName} />
        <TableOfContents content={rawContent || articleData.content} />
      </PageContainer>
      <Footer />
    </div>
  );
}
