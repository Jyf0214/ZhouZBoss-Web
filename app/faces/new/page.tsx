import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { getContentIndexes } from '@/lib/content';
import { Navbar } from '@/components/Navbar';
import { FaceForm } from '../FaceForm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: '新建联系人 - 通讯录',
  description: '创建新的联系人',
};

export default async function NewFacePage() {
  const session = await getSession();
  const config = await loadConfigAsync();
  const dbAvailable = hasDatabase();

  if (!session) {
    notFound();
  }

  const indexes = getContentIndexes('faces');
  const accessibleIndexes = indexes.filter((idx) => {
    return canAccess('faces', idx.slug, true, dbAvailable, config);
  });

  const groups = accessibleIndexes.map((idx) => ({
    slug: idx.slug,
    title: idx.title,
    groupName: idx.groupName,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-20">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-900 mb-4">
            新建联系人
          </h1>
          <p className="text-zinc-400 text-lg">添加新联系人到通讯录</p>
        </div>
        <div className="bg-white rounded-3xl border border-zinc-100 p-8 md:p-12">
          <FaceForm groups={groups} />
        </div>
      </main>
    </div>
  );
}
