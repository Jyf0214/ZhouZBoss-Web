'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, User, Calendar, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { GlobalLoading } from '@/components/Loading';
import Footer from '@/components/Footer';
import { useConfig } from '@/hooks/use-config';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { ReadingProgressBar } from '@/components/ui/ReadingProgressBar';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

interface ArticleData {
  title?: string;
  content?: string;
  tags?: string[];
  authorName?: string;
  author?: string;
  date?: string;
  coverImage?: string;
  cover?: string;
}

/**
 * 文章查看页 — 通过 API 获取内容
 */
function ArticleMetaSection({ articleData, userParam }: { articleData: ArticleData; userParam: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-zinc-400 border-y border-zinc-100 py-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
          <User size={20} />
        </div>
        <div>
          <div className="font-black text-zinc-900 leading-none mb-1">{articleData.authorName ?? articleData.author ?? 'Anonymous'}</div>
          {userParam && (
            <Tag size="xs" variant="outline">@{userParam}</Tag>
          )}
        </div>
      </div>
      {articleData.date && (
        <>
          <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <time className="text-sm font-bold text-zinc-500">
              {new Date(articleData.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </div>
        </>
      )}
    </div>
  );
}

function ArticleHeaderSection({ articleData, userParam }: { articleData: ArticleData; userParam: string | null }) {
  return (
    <header className="mb-12">
      <div className="flex flex-wrap gap-2 mb-8">
        {articleData.tags?.map((tag: string) => (
          <Tag key={tag} variant="light" size="md" className="flex items-center gap-1.5">
            <TagIcon size={12} /> {tag}
          </Tag>
        ))}
      </div>
      <h1 className="text-4xl md:text-7xl font-display font-black tracking-tight text-zinc-900 mb-10 leading-[1.05]">
        {articleData.title}
      </h1>
      <ArticleMetaSection articleData={articleData} userParam={userParam} />
    </header>
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-display font-black text-zinc-900 mb-4">404</h1>
        <p className="text-zinc-500 mb-8">Article not found in this kernel.</p>
        <Link href="/">
          <Button variant="primary" size="lg">Back Home</Button>
        </Link>
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <GlobalLoading size="large" />
    </div>
  );
}

function ArticleViewContent() {
  const searchParams = useSearchParams();
  const userParam = searchParams?.get('user');
  const articleParam = searchParams?.get('article');

  const { config: siteConfig } = useConfig();
  const [article, setArticle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${articleParam}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
        } else {
          showError('文章加载失败');
        }
      } catch (error) {
		console.error('Fetch article error:', error);
		showError('文章加载失败');
      } finally {
        setLoading(false);
      }
    };
    if (articleParam) void fetchArticle();
  }, [articleParam]);

  if (loading) return <LoadingView />;

  const articleData = article as ArticleData;

  if (!article) return <NotFoundView />;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ReadingProgressBar />
      <ScrollToTop />
      <PageContainer maxWidth="4xl" padding="wide">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-12 transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <article>
          <ArticleHeaderSection articleData={articleData} userParam={userParam ?? null} />

          {(articleData.coverImage ?? articleData.cover) && (
            <div className="w-full aspect-[21/9] rounded-[2rem] overflow-hidden bg-zinc-50 mb-16 shadow-2xl shadow-zinc-200 relative">
              <Image
                src={articleData.coverImage ?? articleData.cover ?? ''}
                alt={articleData.title ?? ''}
                fill
                className="object-cover hover:scale-105 transition-transform duration-1000"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                unoptimized
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <MarkdownRenderer content={articleData.content ?? ''} highlight={siteConfig?.highlight} />
          </div>
        </article>
      </PageContainer>

      <Footer />
    </div>
  );
}

export default function ArticleViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><GlobalLoading size="large" /></div>}>
      <ArticleViewContent />
    </Suspense>
  );
}
