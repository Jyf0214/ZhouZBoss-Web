'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ArticleCard } from '@/components/ArticleCard';
import type { UserProfile } from '@/lib/user';
import { type Article } from '@/types/content';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import { Avatar } from '@/components/Avatar';
import Footer from '@/components/Footer';
import AuthorCard from '@/components/AuthorCard';
import { useConfig } from '@/hooks/use-config';
import { Calendar, Mail, BookOpen } from 'lucide-react';
import Link from 'next/link';

function calcTotalWords(text: string): number {
  const cleaned = text.replace(/[#*`\[\]()>|~_\-]/g, '').replace(/\s+/g, ' ').trim();
  const chineseChars = (cleaned.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishWords = cleaned.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  return chineseChars + englishWords;
}

function UserProfileContent() {
  const params = useParams();
  const username = params?.user as string;
  const { t } = useI18n();

  const { config: siteConfig } = useConfig();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Find user by username
        const res = await fetch(`/api/users/${username}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          
          // Fetch user's articles
          const articlesRes = await fetch(`/api/articles?author=${data.uid}`);
          if (articlesRes.ok) {
            const articlesData = await articlesRes.json();
            setArticles(articlesData.filter((a: Article) => a.status === 'published'));
          }
        }
      } catch (error) {
        console.error('Fetch user error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (username) void fetchUser();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <GlobalLoading size="large" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-display font-black text-zinc-900 mb-4">{t('error.404')}</h1>
        <p className="text-zinc-500 mb-8">{t('error.notFound')}</p>
        <Link href="/" className="lobe-button bg-zinc-900 text-white px-8 py-3 rounded-xl">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* User Profile Header */}
        <div className="bg-zinc-50 border-b border-zinc-100">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-zinc-200 overflow-hidden">
                <Avatar name={user.name} avatarUrl={user.avatar ?? undefined} size={96} />
              </div>
              
              <h1 className="text-4xl font-display font-black text-zinc-900 mb-2">
                {user.name}
              </h1>
              
              <p className="text-zinc-400 font-medium mb-6">@{username}</p>
              
              <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                </div>
                {user.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <AuthorCard
          authorName={user.name}
          authorAvatar={user.avatar ?? undefined}
          authorUrl={`/${username}`}
        />

        {/* Articles Grid */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          {(() => {
            const showTotal = siteConfig?.wordcount?.totalWordcount === true;
            const totalWords = showTotal ? articles.reduce((sum, a) => sum + calcTotalWords(a.content ?? ''), 0) : 0;
            return (
              <h2 className="text-2xl font-display font-bold text-zinc-900 mb-8">
                Articles ({articles.length})
                {showTotal && totalWords > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-normal text-zinc-400 ml-3">
                    <BookOpen size={14} />
                    总计 {totalWords} 字
                  </span>
                )}
              </h2>
            );
          })()}
          
          {articles.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="font-medium">No articles published yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} wordcount={siteConfig?.wordcount} postMeta={siteConfig?.postMeta?.page} coverConfig={siteConfig?.cover} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <UserProfileContent />
    </Suspense>
  );
}
