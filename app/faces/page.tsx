import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { FacesListClient } from './FacesListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '通讯录 - Originium Kernel',
  description: '同学录与通讯录',
};

export default async function FacesPage() {
  const config = await loadConfigAsync();
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const allFiles = getContentFiles('faces');
  const indexes = getContentIndexes('faces');

  const accessibleFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    return canAccess('faces', file.slug, isAuthenticated, dbAvailable, config) &&
      canAccess('faces', dirSlug || '/', isAuthenticated, dbAvailable, config);
  });

  const accessibleIndexes = indexes.filter((idx) => {
    return canAccess('faces', idx.slug, isAuthenticated, dbAvailable, config);
  });

  // 仅传递列表展示所需字段
  const faces = accessibleFiles.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    tags: f.meta.tags || [],
    description: f.meta.description,
  }));

  const groups = accessibleIndexes.map((idx) => ({
    slug: idx.slug,
    title: idx.title,
    description: idx.description,
    public: idx.public,
    groupName: idx.groupName,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-4">
          通讯录
        </h1>
        <p className="text-zinc-400 text-lg mb-12">同学录与通讯录</p>
        <FacesListClient faces={faces} groups={groups} />
      </main>
    </div>
  );
}
