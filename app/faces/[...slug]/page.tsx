'use client';

import React from 'react';
import { type ContentFile } from '@/types/content';
import { Avatar } from '@/components/Avatar';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import Link from 'next/link';
import { ArrowLeft, Code, Eye } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import Footer from '@/components/Footer';
import { notFound, useParams } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useConfig } from '@/hooks/use-config';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <GlobalLoading size="large" />
    </div>
  );
}

function BreadcrumbsNav({ slugArray }: { slugArray: string[] }) {
  const { t } = useI18n();
  const breadcrumbs = slugArray.map((segment, index) => ({
    label: segment,
    href: '/faces/' + slugArray.slice(0, index + 1).join('/'),
    isLast: index === slugArray.length - 1,
  }));

  return (
    <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8 flex-wrap">
      <Link href="/faces" className="hover:text-zinc-900 transition-colors flex items-center gap-1">
        <ArrowLeft size={14} />
        {t('nav.faces')}
      </Link>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-2">
          <span>/</span>
          {crumb.isLast ? (
            <span className="text-zinc-900 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-zinc-900 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function FaceDetailHeader({ file, isSudo, rawContent, showRaw, setShowRaw }: {
  file: ContentFile;
  isSudo: boolean;
  rawContent: string;
  showRaw: boolean;
  setShowRaw: (v: boolean) => void;
}) {
  const { config: siteConfig } = useConfig();
  return (
    <header className="mb-12 text-center">
      <div className="flex justify-center mb-6">
        <Avatar
          name={file.meta.title}
          size={128}
          fallbackImg={siteConfig?.errorImg?.flink}
        />
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">
        {file.meta.title}
      </h1>
      {file.meta.description && (
        <p className="text-sm text-zinc-400">{file.meta.description}</p>
      )}
      {file.meta.tags && file.meta.tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {file.meta.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-full border border-zinc-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {isSudo && rawContent && (
        <div className="mt-6">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {showRaw ? <Eye size={18} /> : <Code size={18} />}
            <span className="text-sm font-bold">{showRaw ? '预览渲染' : '查看原始文件'}</span>
          </button>
        </div>
      )}
    </header>
  );
}

function FaceDetailContent({ file, showRaw, rawContent }: {
  file: ContentFile;
  showRaw: boolean;
  rawContent: string;
}) {
  const { config: siteConfig } = useConfig();
  return (
    <div className="max-w-3xl mx-auto">
      {showRaw && rawContent ? (
        <pre className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {rawContent}
        </pre>
      ) : (
        <MarkdownRenderer content={file.content} highlight={siteConfig?.highlight} />
      )}
    </div>
  );
}

export default function FaceDetailPage() {
  const params = useParams();
  const slugArray = params?.slug as string[] || [];
  const fullPath = '/' + slugArray.join('/');
  const { isSudo } = useAuth();

  const [file, setFile] = React.useState<ContentFile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showRaw, setShowRaw] = React.useState(false);
  const [rawContent, setRawContent] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/faces${fullPath}`);
        if (res.ok) {
          const contentFile = await res.json();
          setFile(contentFile);
          if (contentFile.rawContent) {
            setRawContent(contentFile.rawContent);
          }
        } else if (res.status === 404) {
          setFile(null);
        }
      } catch (err) {
        console.error('Failed to fetch face details:', err);
        showError('联系人详情加载失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [fullPath]);

  if (loading) return <LoadingView />;
  if (!file) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <PageContainer maxWidth="4xl">
        <BreadcrumbsNav slugArray={slugArray} />
        <article>
          <FaceDetailHeader
            file={file}
            isSudo={isSudo}
            rawContent={rawContent}
            showRaw={showRaw}
            setShowRaw={setShowRaw}
          />
          <FaceDetailContent file={file} showRaw={showRaw} rawContent={rawContent} />
        </article>
      </PageContainer>
      <Footer />
    </div>
  );
}
