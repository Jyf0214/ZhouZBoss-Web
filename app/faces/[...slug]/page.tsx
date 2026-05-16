'use client';

import React from 'react';
import { type ContentFile } from '@/types/content';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import Link from 'next/link';
import { ArrowLeft, Code, Eye } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { showError } from '@/lib/error';

export default function FaceDetailPage() {
  const params = useParams();
  const slugArray = params?.slug as string[] || [];
  const fullPath = '/' + slugArray.join('/');
  const { t } = useI18n();
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
    fetchData();
  }, [fullPath]);

  if (loading) return null;
  if (!file) notFound();

  const breadcrumbs = slugArray.map((segment, index) => ({
    label: segment,
    href: '/faces/' + slugArray.slice(0, index + 1).join('/'),
    isLast: index === slugArray.length - 1,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        {/* 面包屑 */}
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

        {/* 联系人信息 */}
        <article>
          <header className="mb-12 text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-zinc-100">
              <span className="text-5xl font-black text-zinc-200">
                {file.meta.title.charAt(0)}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-900 mb-4">
              {file.meta.title}
            </h1>
            {file.meta.description && (
              <p className="text-zinc-400 text-lg">{file.meta.description}</p>
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

          {/* 详细内容 */}
          <div className="max-w-3xl mx-auto">
            {showRaw && rawContent ? (
              <pre className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {rawContent}
              </pre>
            ) : (
              <MarkdownRenderer content={file.content} />
            )}
          </div>
        </article>
      </main>
      <footer className="border-t border-zinc-100 py-12 bg-zinc-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-400 text-sm font-medium">Originium Kernel</p>
        </div>
      </footer>
    </div>
  );
}
