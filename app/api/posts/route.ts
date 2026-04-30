import { getContentFiles, getContentIndexes } from '@/lib/content';

/**
 * 帖子列表 API — 纯文件系统读取，不查数据库
 * 仅供后台管理使用
 */
export async function GET() {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  return Response.json({
    posts: allFiles.map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      author: f.meta.author,
      tags: f.meta.tags,
      cover: f.meta.cover,
      description: f.meta.description,
    })),
    indexes: indexes.map((idx) => ({
      slug: idx.slug,
      title: idx.title,
      description: idx.description,
      public: idx.public,
      groupName: idx.groupName,
    })),
  });
}
