'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, User, Clock } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import Link from 'next/link';
import { useI18n } from '@/hooks/use-i18n';
import { useConfig } from '@/hooks/use-config';
import { showError } from '@/lib/error';
import { estimateReadingTime } from '@/lib/reading-time';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import ShareButtons from '@/components/ShareButtons';
import { ReadingProgressBar } from '@/components/ui/ReadingProgressBar';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

/**
 * 文章详情页 — 通过 API 获取内容（草稿从数据库，已发布从 GitHub）
 */
interface ArticleData {
  title?: string;
  content?: string;
  tags?: string[];
  authorName?: string;
  author?: string;
  date?: string;
}

export default function ArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const { t } = useI18n();

  const { config: siteConfig } = useConfig();
  const [article, setArticle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
        } else {
          showError('文章加载失败');
        }
      } catch (error) {
		console.error('Fetch article failed:', error);
		showError('文章加载失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchArticle();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <GlobalLoading size="large" />
      </div>
    </div>
  );

  const articleData = article as ArticleData;

  if (!article) return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6 text-zinc-300">
          <User size={40} />
        </div>
        <h1 className="text-3xl font-display font-bold text-zinc-900 mb-4">{t('error.notFound')}</h1>
        <p className="text-zinc-500 mb-8 max-w-md">{t('error.networkError')}</p>
        <Link href="/">
          <Button variant="primary" size="lg">{t('common.back')}</Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ReadingProgressBar />
      <ScrollToTop />
      <PageContainer maxWidth="4xl" padding="wide">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-10 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to articles</span>
        </Link>

        <article>
          <header className="mb-12">
            {articleData.tags && articleData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {articleData.tags.map((tag: string) => (
                  <Tag key={tag} variant="light" size="md">
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-zinc-900 mb-6 leading-tight">
              {articleData.title}
            </h1>
            <div className="flex items-center gap-4 text-zinc-500 border-b border-zinc-100 pb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-sm font-bold text-zinc-600">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 leading-none mb-1">{articleData.authorName ?? articleData.author ?? 'Anonymous'}</div>
                </div>
              </div>
              {articleData.date && (
                <>
                  <span className="text-zinc-200">|</span>
                  <time className="text-sm font-medium" dateTime={articleData.date}>
                    {new Date(articleData.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                </>
              )}
              {articleData.content && (
                <>
                  <span className="text-zinc-200">|</span>
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Clock size={14} />
                    <span>阅读 {estimateReadingTime(articleData.content)} 分钟</span>
                  </span>
                </>
              )}
            </div>
          </header>

          <div className="max-w-3xl mx-auto prose prose-zinc lg:prose-xl">
            <MarkdownRenderer content={articleData.content ?? ''} highlight={siteConfig?.highlight} />
          </div>

          <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100">
            <ShareButtons config={siteConfig?.share} title={articleData.title} variant="horizontal" />
          </div>
        </article>
      </PageContainer>
    </div>
  );
}
