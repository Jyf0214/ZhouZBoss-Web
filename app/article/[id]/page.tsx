'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const [article] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        // TODO: 从 GitHub 或 Redis 获取文章内容
        console.log('Fetching article:', id);
      } catch (error) {
        console.error('Fetch article failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-full"></div>
          <div className="h-4 w-32 bg-zinc-100 rounded"></div>
        </div>
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
        <h1 className="text-3xl font-display font-bold text-zinc-900 mb-4">Article not found</h1>
        <p className="text-zinc-500 mb-8 max-w-md">The article you are looking for might have been removed or is temporarily unavailable.</p>
        <Link href="/" className="lobe-button bg-zinc-900 text-white px-8 py-3 rounded-xl hover:bg-zinc-800 transition-all">
          Return to home
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
                  <div className="font-bold text-zinc-900 leading-none mb-1">{article.authorName}</div>
                  <div className="text-xs">{article.authorRole || 'Author'}</div>
                </div>
              </div>
              <span className="text-zinc-200">|</span>
              <time className="text-sm font-medium" dateTime={article.createdAt}>
                {new Date(article.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </div>
          </header>

          {article.coverImage && (
            <div className="w-full aspect-video rounded-3xl overflow-hidden bg-zinc-50 mb-12 shadow-sm relative">
              <Image 
                src={article.coverImage} 
                alt={article.title} 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                unoptimized
              />
            </div>
          )}

          <div className="max-w-3xl mx-auto prose prose-zinc lg:prose-xl">
            <MarkdownRenderer content={article.content} />
          </div>
        </article>
      </main>
    </div>
  );
}
