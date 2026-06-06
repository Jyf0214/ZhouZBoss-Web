'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { GlobalLoading } from '@/components/Loading';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useConfig } from '@/hooks/use-config';
import { useMainTone } from '@/hooks/use-main-tone';
import { Button } from '@/components/ui/Button';
import { useArticleFetcher } from './use-article-fetcher';
import { ArticlePageBody } from './ArticlePageBody';

export function UserArticleContent() {
  const params = useParams();
  const username = params?.user as string;
  const article = params?.article as string;
  const { t } = useI18n();
  const { isSudo } = useAuth();

  const { articleData, userData, loading, rawContent } = useArticleFetcher(username, article);

  const [showRaw, setShowRaw] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  const { config: siteConfig } = useConfig();
  const { mainColor } = useMainTone(
    articleData?.coverImage,
    siteConfig?.mainTone?.mode,
    siteConfig?.mainTone?.enable,
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <GlobalLoading size="large" />
      </div>
    );
  }

  if (!articleData) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-4xl font-display font-black text-zinc-900 mb-4">{t('error.404')}</h1>
          <p className="text-zinc-500 mb-8">{t('error.notFound')}</p>
          <Link href="/">
            <Button variant="primary" size="lg">{t('common.back')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ArticlePageBody
      articleData={articleData}
      userData={userData}
      username={username}
      isSudo={isSudo}
      showRaw={showRaw}
      rawContent={rawContent}
      articleRef={articleRef}
      siteConfig={siteConfig}
      mainColor={mainColor}
      article={article}
      onToggleRaw={() => setShowRaw(!showRaw)}
    />
  );
}
