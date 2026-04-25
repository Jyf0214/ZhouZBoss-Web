import { NextRequest, NextResponse } from 'next/server';
import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';

/**
 * 帖子列表 API
 * 根据认证状态和数据库可用性返回可访问的帖子
 */
export async function GET(req: NextRequest) {
  const config = await loadConfigAsync();
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  const accessibleFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    return canAccess('posts', file.slug, isAuthenticated, dbAvailable, config) &&
      canAccess('posts', dirSlug || '/', isAuthenticated, dbAvailable, config);
  });

  const accessibleIndexes = indexes.filter((idx) => {
    return canAccess('posts', idx.slug, isAuthenticated, dbAvailable, config);
  });

  return NextResponse.json({
    posts: accessibleFiles.map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      author: f.meta.author,
      tags: f.meta.tags,
      cover: f.meta.cover,
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
