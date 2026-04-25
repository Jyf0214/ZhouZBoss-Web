import { NextRequest, NextResponse } from 'next/server';
import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';

/**
 * 通讯录列表 API
 * 根据认证状态和数据库可用性返回可访问的通讯录条目
 */
export async function GET(req: NextRequest) {
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

  return NextResponse.json({
    faces: accessibleFiles.map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      tags: f.meta.tags,
      description: f.meta.description,
    })),
    indexes: accessibleIndexes.map((idx) => ({
      slug: idx.slug,
      title: idx.title,
      description: idx.description,
      public: idx.public,
      groupName: idx.groupName,
    })),
    site: config.site,
  });
}
