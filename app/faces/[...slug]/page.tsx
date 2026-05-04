import { getContentFile, getAllSlugs } from '@/lib/content';
import { canAccess, hasDatabase, loadConfigAsync } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs('faces');
  return slugs
    .filter((slug) => canAccess('faces', slug, false, false))
    .map((slug) => ({
      slug: slug.slice(1).split('/'),
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const file = getContentFile('faces', fullPath);
  if (!file) return { title: '未找到' };
  return {
    title: `${file.meta.title} - 通讯录`,
    description: file.meta.description || file.content.slice(0, 160),
  };
}

export default async function FaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const config = await loadConfigAsync();
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  const file = getContentFile('faces', fullPath);
  if (!file) notFound();

  if (!isAdmin) {
    if (!canAccess('faces', fullPath, isAuthenticated, dbAvailable, config) || file.meta.public !== true) {
      notFound();
    }
  }

  const breadcrumbs = slug.map((segment, index) => ({
    label: segment,
    href: '/faces/' + slug.slice(0, index + 1).join('/'),
    isLast: index === slug.length - 1,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8 flex-wrap">
          <Link href="/faces" className="hover:text-zinc-900 transition-colors flex items-center gap-1">
            <ArrowLeft size={14} />
            通讯录
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
                {file.meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-full border border-zinc-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* 详细内容 */}
          <div className="max-w-3xl mx-auto">
            <MarkdownRenderer content={file.content} />
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
