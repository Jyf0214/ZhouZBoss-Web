'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Avatar } from '@/components/Avatar';
import { ArrowLeft, Calendar, Tag as TagIcon, Code, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { GlobalLoading } from '@/components/Loading';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import ShareButtons from '@/components/ShareButtons';
import Footer from '@/components/Footer';
import ArticleCopyright from '@/components/ArticleCopyright';
import RewardArea from '@/components/RewardArea';
import AuthorCard from '@/components/AuthorCard';
import PostEditLink from '@/components/PostEditLink';
import TableOfContents from '@/components/TableOfContents';
import CopyInterceptor from '@/components/CopyInterceptor';
import { useConfig, type FrontendConfig } from '@/hooks/use-config';
import { useMainTone } from '@/hooks/use-main-tone';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

interface ArticleData {
  id: string;
  title: string;
  authorName: string;
  content: string;
  tags: string[];
  coverImage: string;
  createdAt: string;
  status: string;
  category?: string;
}

interface UserInfo {
  uid: string;
  name: string;
  avatar?: string;
}

interface PostMetaPostConfig {
  dateType?: string;
  dateFormat?: string;
  categories?: boolean;
  tags?: boolean;
  label?: boolean;
  unread?: boolean;
}

function TagsSection({ tags, show }: { tags?: string[]; show: boolean }) {
  if (!show || !tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {tags.map((tag: string) => (
        <Tag key={tag} variant="light" size="md" className="flex items-center gap-1.5">
          <TagIcon size={12} />
          {tag}
        </Tag>
      ))}
    </div>
  );
}

function DateSection({ displayDate }: { displayDate: string | null }) {
  if (!displayDate) return null;
  return (
    <>
      <div className="h-8 w-px bg-zinc-100 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <Calendar size={18} />
        <time className="text-sm font-bold text-zinc-500">{displayDate}</time>
      </div>
    </>
  );
}

function SudoActions({ showRaw, rawContent, onToggleRaw }: {
  showRaw: boolean; rawContent: string; onToggleRaw: () => void;
}) {
  if (!rawContent) return null;
  return (
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
  );
}

function ArticleLabelBadge({ postMeta, category }: {
  postMeta?: PostMetaPostConfig;
  category?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {postMeta?.label && (
        <Tag variant="dark" size="sm">
          文章
        </Tag>
      )}
      {postMeta?.unread && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          未读
        </span>
      )}
      {postMeta?.categories && category && (
        <Tag variant="light" size="sm">
          {category}
        </Tag>
      )}
    </div>
  );
}

function ArticleHeader({
  articleData,
  userData,
  username,
  isSudo,
  showRaw,
  rawContent,
  onToggleRaw,
  postMeta,
}: {
  articleData: ArticleData;
  userData: UserInfo | null;
  username: string;
  isSudo: boolean;
  showRaw: boolean;
  rawContent: string;
  onToggleRaw: () => void;
  postMeta?: PostMetaPostConfig;
}) {
  const dateType = postMeta?.dateType ?? 'both';
  const dateFormat = postMeta?.dateFormat ?? 'date';
  const showTags = postMeta?.tags !== false;

  const dateOptions: Intl.DateTimeFormatOptions = dateFormat === 'simple'
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  const displayDate = dateType === 'none' ? null : new Date(articleData.createdAt).toLocaleDateString('zh-CN', dateOptions);

  return (
    <header className="mb-12">
      <ArticleLabelBadge postMeta={postMeta} category={articleData.category} />

      <TagsSection tags={articleData.tags} show={showTags} />

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

        <DateSection displayDate={displayDate} />

        {isSudo && <SudoActions showRaw={showRaw} rawContent={rawContent} onToggleRaw={onToggleRaw} />}
      </div>
    </header>
  );
}

function ArticleCoverImage({ coverImage, title, mainColor, defaultCover, errorFallback }: {
  coverImage: string; title: string; mainColor?: string | null;
  defaultCover?: string; errorFallback?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [fallbackImgError, setFallbackImgError] = useState(false);

  const src = coverImage ?? defaultCover ?? '';
  if (!src) return null;

  return (
    <div
      className="w-full aspect-[21/9] rounded-3xl overflow-hidden bg-zinc-50 mb-16 relative"
      style={mainColor ? { boxShadow: `0 25px 50px -12px ${mainColor}40` } : { boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
    >
      {imgError && !fallbackImgError && errorFallback ? (
        <Image
          src={errorFallback}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          unoptimized
          onError={() => setFallbackImgError(true)}
        />
      ) : imgError || fallbackImgError ? (
        <div className="w-full h-full flex items-center justify-center text-zinc-200 font-black text-6xl select-none">
          {title.charAt(0)}
        </div>
      ) : (
        <Image
          src={src}
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

function useArticleFetcher(username: string, article: string) {
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawContent, setRawContent] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/u/${username}/${article}`);
        if (res.ok) {
          const data = await res.json();
          const { user, rawContent: raw, ...articleFields } = data;
          setArticleData(articleFields as ArticleData);
          setUserData(user);
          if (raw) {
            setRawContent(raw);
          }
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

    if (username && article) void fetchArticle();
  }, [username, article]);

  return { articleData, userData, loading, rawContent };
}

function ArticleCoverSection({
  articleData,
  siteConfig,
  mainColor,
}: {
  articleData: ArticleData;
  siteConfig: FrontendConfig | null;
  mainColor: string | null | undefined;
}) {
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
}

function ArticleContentSection({
  showRaw,
  rawContent,
  content,
  highlight,
}: {
  showRaw: boolean;
  rawContent: string;
  content: string;
  highlight: FrontendConfig['highlight'] | undefined;
}) {
  if (showRaw && rawContent) {
    return (
      <pre className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {rawContent}
      </pre>
    );
  }

  return <MarkdownRenderer content={content} highlight={highlight} />;
}

function ArticleShareSection({
  id,
  article,
  shareConfig,
  title,
}: {
  id: string;
  article: string;
  shareConfig: FrontendConfig['share'] | null | undefined;
  title: string;
}) {
  const slug = id || article;
  const showShare = shareConfig && (shareConfig.sharejs.enable || shareConfig.addtoany.enable);

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between">
      <PostEditLink slug={slug} />
      {showShare && <ShareButtons config={shareConfig} title={title} variant="horizontal" />}
    </div>
  );
}

function ArticlePageBody({
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

          <ArticleCoverSection
            articleData={articleData}
            siteConfig={siteConfig}
            mainColor={mainColor}
          />

          <ArticleContentSection
            showRaw={showRaw}
            rawContent={rawContent}
            content={articleData.content}
            highlight={siteConfig?.highlight}
          />

          <ArticleShareSection
            id={articleData.id}
            article={article}
            shareConfig={siteConfig?.share}
            title={articleData.title}
          />

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

function UserArticleContent() {
  const params = useParams();
  const username = params?.user as string;
  const article = params?.article as string;
  const { t } = useI18n();
  const { isSudo } = useAuth();

  const { articleData, userData, loading, rawContent } = useArticleFetcher(username, article);

  const [showRaw, setShowRaw] = useState(false);
  const articleRef = React.useRef<HTMLDivElement>(null);

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

export default function UserArticlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <UserArticleContent />
    </Suspense>
  );
}
