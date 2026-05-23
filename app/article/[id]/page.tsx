'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, User } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import Link from 'next/link';
import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';

/**
 * 文章详情页 — 通过 API 获取内容（草稿从数据库，已发布从 GitHub）
 */
export default function ArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const { t } = useI18n();

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
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <GlobalLoading size="large" />
      </div>
    </div>
  );

  if (!article) return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6 text-zinc-300">
          <User size={40} />
        </div>
        <h1 className="text-3xl font-display font-bold text-zinc-900 mb-4">{t('error.notFound')}</h1>
        <p className="text-zinc-500 mb-8 max-w-md">{t('error.networkError')}</p>
        <Link href="/" className="bg-zinc-900 text-white px-8 py-3 rounded-xl hover:bg-zinc-800 transition-all">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-10 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to articles</span>
        </Link>

        <article>
          <header className="mb-12">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-wider rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-zinc-900 mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-zinc-500 border-b border-zinc-100 pb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-sm font-bold text-zinc-600">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 leading-none mb-1">{article.authorName ?? article.author ?? 'Anonymous'}</div>
                </div>
              </div>
              {article.date && (
                <>
                  <span className="text-zinc-200">|</span>
                  <time className="text-sm font-medium" dateTime={article.date}>
                    {new Date(article.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>
                </>
              )}
            </div>
          </header>

          <div className="max-w-3xl mx-auto prose prose-zinc lg:prose-xl">
            <MarkdownRenderer content={article.content ?? ''} />
          </div>
        </article>
      </main>
    </div>
  );
}
