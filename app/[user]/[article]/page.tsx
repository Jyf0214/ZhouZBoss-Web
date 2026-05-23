'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Avatar } from '@/components/Avatar';
import { ArrowLeft, Calendar, Tag, Code, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { GlobalLoading } from '@/components/Loading';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import ShareButtons from '@/components/ShareButtons';
import Footer from '@/components/Footer';
import { useConfig } from '@/hooks/use-config';
import { useMainTone } from '@/hooks/use-main-tone';

interface ArticleData {
  id: string;
  title: string;
  authorName: string;
  content: string;
  tags: string[];
  coverImage: string;
  createdAt: string;
  status: string;
}

interface UserInfo {
  uid: string;
  name: string;
  avatar?: string;
}

function ArticleHeader({
  articleData,
  userData,
  username,
  isSudo,
  showRaw,
  rawContent,
  onToggleRaw,
}: {
  articleData: ArticleData;
  userData: UserInfo | null;
  username: string;
  isSudo: boolean;
  showRaw: boolean;
  rawContent: string;
  onToggleRaw: () => void;
}) {
  const createdDate = new Date(articleData.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="mb-12">
      <div className="flex flex-wrap gap-2 mb-8">
        {articleData.tags?.map((tag: string) => (
          <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-full border border-zinc-100">
            <Tag size={12} />
            {tag}
          </span>
        ))}
      </div>

      <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-zinc-900 mb-10 leading-[1.05]">
        {articleData.title}
      </h1>

      <div className="flex flex-wrap items-center gap-6 text-zinc-400 border-y border-zinc-100 py-8">
        <div className="flex items-center gap-3">
          <Avatar name={articleData.authorName} avatarUrl={userData?.avatar ?? undefined} size={48} />
          <div>
            <div className="font-black text-zinc-900 leading-none mb-1">{articleData.authorName}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">@{username}</div>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <Calendar size={18} />
          <time className="text-sm font-bold text-zinc-500">{createdDate}</time>
        </div>

        {isSudo && rawContent && (
          <>
            <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>
            <button
              onClick={onToggleRaw}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              {showRaw ? <Eye size={18} /> : <Code size={18} />}
              <span className="text-sm font-bold">{showRaw ? '预览渲染' : '查看原始文件'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function ArticleCoverImage({ coverImage, title, mainColor }: { coverImage: string; title: string; mainColor?: string | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="w-full aspect-[21/9] rounded-3xl overflow-hidden bg-zinc-50 mb-16 relative"
      style={mainColor ? { boxShadow: `0 25px 50px -12px ${mainColor}40` } : { boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
    >
      {imgError ? (
        <div className="w-full h-full flex items-center justify-center text-zinc-200 font-black text-6xl select-none">
          {title.charAt(0)}
        </div>
      ) : (
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover hover:scale-105 transition-transform duration-1000"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          unoptimized
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

function UserArticleContent() {
  const params = useParams();
  const username = params?.user as string;
  const article = params?.article as string;
  const { t } = useI18n();
  const { isSudo } = useAuth();

  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [rawContent, setRawContent] = useState('');

  const { config: siteConfig } = useConfig();
  const shareConfig = siteConfig?.share;
  const mainToneConfig = siteConfig?.mainTone;
  const highlightTheme = siteConfig?.highlight?.theme;
  const { mainColor } = useMainTone(
    articleData?.coverImage,
    mainToneConfig?.mode,
    mainToneConfig?.enable,
  );

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/u/${username}/${article}`);
        if (res.ok) {
          const data = await res.json();
          setArticleData(data.article);
          setUserData(data.user);
          if (data.rawContent) {
            setRawContent(data.rawContent);
          }
        }
      } catch (error) {
        console.error('Fetch article error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (username && article) void fetchArticle();
  }, [username, article]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <GlobalLoading size="large" />
    </div>
  );

  if (!articleData) return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-display font-black text-zinc-900 mb-4">{t('error.404')}</h1>
        <p className="text-zinc-500 mb-8">{t('error.notFound')}</p>
        <Link href="/" className="bg-zinc-900 text-white px-8 py-3 rounded-xl hover:bg-zinc-800 transition-colors">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href={`/${username}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-12 transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to {userData?.name}&apos;s Profile</span>
        </Link>

        <article style={mainColor ? { '--main-tone': mainColor } as React.CSSProperties : undefined}>
          <ArticleHeader
            articleData={articleData}
            userData={userData}
            username={username}
            isSudo={isSudo}
            showRaw={showRaw}
            rawContent={rawContent}
            onToggleRaw={() => setShowRaw(!showRaw)}
          />

          {articleData.coverImage && (
            <ArticleCoverImage coverImage={articleData.coverImage} title={articleData.title} mainColor={mainColor} />
          )}

          <div className="max-w-3xl mx-auto">
            {showRaw && rawContent ? (
              <pre className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {rawContent}
              </pre>
            ) : (
              <MarkdownRenderer content={articleData.content} theme={highlightTheme} />
            )}
          </div>

          {shareConfig && (shareConfig.sharejs.enable || shareConfig.addtoany.enable) && (
            <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100">
              <ShareButtons config={shareConfig} title={articleData.title} />
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}

export default function UserArticlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <UserArticleContent />
    </Suspense>
  );
}
