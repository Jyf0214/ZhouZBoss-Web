import { NextResponse } from 'next/server';
import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';

/**
 * 日记列表 API
 * 仅管理员可访问
 */
export async function GET() {
  const session = await getSession();
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  if (!isAdmin) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  const config = await loadConfigAsync();
  const dbAvailable = hasDatabase();
  const allFiles = getContentFiles('diary');
  const indexes = getContentIndexes('diary');

  const accessibleFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    return canAccess('diary', file.slug, true, dbAvailable, config) &&
           canAccess('diary', dirSlug || '/', true, dbAvailable, config);
  });

  const accessibleIndexes = indexes.filter((idx) => {
    return canAccess('diary', idx.slug, true, dbAvailable, config);
  });

  return NextResponse.json({
    diaries: accessibleFiles.map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      tags: f.meta.tags || [],
      description: f.meta.description,
    })),
    indexes: accessibleIndexes.map((idx) => ({
      slug: idx.slug,
      title: idx.title,
      description: idx.description,
      public: idx.public,
      groupName: idx.groupName,
    })),
  });
}
