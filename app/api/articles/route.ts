import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Articles API
 *
 * - GET：返回已发布文章（从 posts/ 文件索引）+ 数据库草稿
 * - POST：草稿存数据库；发布时通过统一 /api/github 端点推送 MD 到 GitHub posts/ 目录
 */

/** 从数据库读取所有草稿元数据 */
async function getDraftsFromDb() {
  const db = getDb();
  const index = await db.hgetall('articles:drafts');
  return Object.entries(index).map(([id, data]) => ({
    id,
    ...JSON.parse(data),
  }));
}

export async function GET() {
  try {
    // 已发布文章：从 posts/ 文件系统索引读取（由 lib/content.ts 在构建时生成）
    const { getContentFiles } = await import('@/lib/content');
    const publishedFiles = getContentFiles('posts');
    const published = publishedFiles.map((f) => ({
      id: f.slug,
      slug: f.slug,
      title: f.meta.title,
      author: f.meta.author,
      date: f.meta.date,
      tags: f.meta.tags || [],
      cover: f.meta.cover,
      description: f.meta.description,
      status: 'published',
    }));

    // 草稿：从数据库读取
    const drafts = await getDraftsFromDb();

    // 合并，按日期降序
    const all = [
      ...published,
      ...drafts.map((d) => ({ ...d, status: 'draft' })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json(all);
  } catch (error) {
    console.error(JSON.stringify({ type: 'list_articles_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取文章列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { title, content, tags, coverImage, status, slug, description } = await req.json();
    const id = `draft-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const articleMeta = {
      id,
      title,
      content: content || '',
      authorId: session.uid,
      authorName: session.email.split('@')[0],
      tags: tags || [],
      coverImage: coverImage || '',
      description: description || '',
      status: status || 'draft',
      createdAt: now,
      updatedAt: now,
    };

    // 发布状态：通过统一 /api/github 端点推送到 GitHub posts/ 目录
    if (status === 'published') {
      const postSlug = slug || `/${articleMeta.authorName}/${id}`;
      const filePath = `posts${postSlug}.md`;

      const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          path: filePath,
          frontMatter: {
            title,
            author: articleMeta.authorName,
            date: now,
            tags: articleMeta.tags,
            ...(coverImage && { cover: coverImage }),
            ...(description && { description }),
          },
          body: content || '',
          message: `feat: publish post "${title}"`,
        }),
      });

      if (!ghResponse.ok) {
        const error = await ghResponse.json();
        return NextResponse.json({ error: error.error || '发布到 GitHub 失败' }, { status: 500 });
      }

      // 发布成功后，数据库仅保留备份元数据（不含内容）
      const db = getDb();
      const backupMeta = { ...articleMeta, status: 'published', content: '', slug: postSlug };
      await db.set(`article:data:${id}`, JSON.stringify(backupMeta));
      await db.hset('articles:published', id, JSON.stringify(backupMeta));

      return NextResponse.json({ success: true, id, slug: postSlug });
    }

    // 草稿状态：仅存数据库
    const db = getDb();
    await db.set(`article:data:${id}`, JSON.stringify(articleMeta));
    await db.hset('articles:drafts', id, JSON.stringify(articleMeta));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(JSON.stringify({ type: 'create_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 });
  }
}
