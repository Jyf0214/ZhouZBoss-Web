import { getContentFile, getAllSlugs, getContentIndexes } from '@/lib/content';
import { canAccess, hasDatabase, loadConfigAsync } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { FaceForm } from '../../FaceForm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs('faces');
  return slugs.map((slug) => ({
    slug: slug.slice(1).split('/'),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const file = getContentFile('faces', fullPath);
  if (!file) return { title: '未找到' };
  return {
    title: `编辑 ${file.meta.title} - 通讯录`,
    description: `编辑联系人 ${file.meta.title} 的信息`,
  };
}

export default async function EditFacePage({ params }: PageProps) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const session = await getSession();
  const config = await loadConfigAsync();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();

  if (!canAccess('faces', fullPath, isAuthenticated, dbAvailable, config)) {
    notFound();
  }

  const file = getContentFile('faces', fullPath);
  if (!file) notFound();

  const indexes = getContentIndexes('faces');
  const accessibleIndexes = indexes.filter((idx) => {
    return canAccess('faces', idx.slug, true, dbAvailable, config);
  });

  const groups = accessibleIndexes.map((idx) => ({
    slug: idx.slug,
    title: idx.title,
    groupName: idx.groupName,
  }));

  const faceData = {
    slug: fullPath,
    name: String(file.meta.name || file.meta.title || ''),
    email: String(file.meta.email || ''),
    phone: String(file.meta.phone || ''),
    group: String(file.meta.group || ''),
    content: String(file.content || ''),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
          <Link href="/faces" className="hover:text-zinc-900 transition-colors flex items-center gap-1">
            <ArrowLeft size={14} />
            通讯录
          </Link>
          <span>/</span>
          <Link href={`/faces${fullPath}`} className="hover:text-zinc-900 transition-colors">
            {file.meta.title}
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">编辑</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-900 mb-4">
            编辑联系人
          </h1>
          <p className="text-zinc-400 text-lg">修改 {file.meta.title} 的信息</p>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 p-8 md:p-12">
          <FaceForm groups={groups} faceData={faceData} isEdit />
        </div>
      </main>
    </div>
  );
}
