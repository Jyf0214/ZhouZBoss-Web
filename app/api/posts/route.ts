import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/posts');

/**
 * 帖子列表 API — 纯文件系统读取，不查数据库
 * 仅供后台管理使用
 */
export async function GET() {
  logger.info('GET', '读取帖子列表');
  const session = await getSession();
  const isAuthenticated = !!session;
  const config = loadConfig();
  const dbAvailable = hasDatabase();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  const accessibleFiles = allFiles.filter((f) =>
    canAccess('posts', f.slug, isAuthenticated, dbAvailable, config)
  );

  const accessibleIndexes = indexes.filter((idx) =>
    canAccess('posts', idx.slug, isAuthenticated, dbAvailable, config)
  );

  logger.info('GET', '帖子列表读取成功', { count: accessibleFiles.length });
  return Response.json({
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
  }, {
    // 帖子列表缓存：CDN 缓存 60s，过期后后台重验证 300s
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
