'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, User, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';

/**
 * 文章查看页 — 通过 API 获取内容
 */
function ArticleViewContent() {
  const searchParams = useSearchParams();
  const userParam = searchParams?.get('user');
  const articleParam = searchParams?.get('article');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${articleParam}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
        }
      } catch (error) {
		console.error('Fetch article error:', error);
		showError('文章加载失败');
      } finally {
        setLoading(false);
      }
    };
    if (articleParam) fetchArticle();
  }, [articleParam]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <GlobalLoading size="large" />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-display font-black text-zinc-900 mb-4">404</h1>
        <p className="text-zinc-500 mb-8">Article not found in this kernel.</p>
        <Link href="/" className="bg-zinc-900 text-white px-8 py-3 rounded-xl">
          Back Home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-12 transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <article>
          <header className="mb-12">
            <div className="flex flex-wrap gap-2 mb-8">
              {article.tags?.map((tag: string) => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-full border border-zinc-100">
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>
            <h1 className="text-4xl md:text-7xl font-display font-black tracking-tight text-zinc-900 mb-10 leading-[1.05]">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-zinc-400 border-y border-zinc-100 py-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-black text-zinc-900 leading-none mb-1">{article.authorName || article.author || 'Anonymous'}</div>
                  {userParam && (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">@{userParam}</div>
                  )}
                </div>
              </div>
              {article.date && (
                <>
                  <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <time className="text-sm font-bold text-zinc-500">
                      {new Date(article.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  </div>
                </>
              )}
            </div>
          </header>

          {(article.coverImage || article.cover) && (
            <div className="w-full aspect-[21/9] rounded-[2rem] overflow-hidden bg-zinc-50 mb-16 shadow-2xl shadow-zinc-200 relative">
              <Image
                src={article.coverImage || article.cover}
                alt={article.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-1000"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                unoptimized
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <MarkdownRenderer content={article.content || ''} />
          </div>
        </article>
      </main>

      <footer className="border-t border-zinc-100 py-12 bg-zinc-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-400 text-sm font-medium">Published with Originium Kernel</p>
        </div>
      </footer>
    </div>
  );
}

export default function ArticleViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ArticleViewContent />
    </Suspense>
  );
}
