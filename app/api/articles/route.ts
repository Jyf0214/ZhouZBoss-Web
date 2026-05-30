import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { loadConfig, canAccess, hasDatabase } from '@/lib/config';
import { getDraft, saveDraft } from '@/lib/draft-storage';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/articles');

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
    logger.info('GET', '获取文章列表');
    // 已发布文章：从 posts/ 文件系统索引读取（由 lib/content.ts 在构建时生成）
    const session = await getSession();
    const isAuthenticated = !!session;
    const config = loadConfig();
    const dbAvailable = hasDatabase();
    const { getContentFiles } = await import('@/lib/content');
    const publishedFiles = getContentFiles('posts').filter((f) =>
      canAccess('posts', f.slug, isAuthenticated, dbAvailable, config)
    );
    const published = publishedFiles.map((f) => ({
      id: f.slug,
      slug: f.slug,
      title: f.meta.title,
      author: f.meta.author,
      date: f.meta.date,
      tags: f.meta.tags ?? [],
      cover: f.meta.cover,
      description: f.meta.description,
      status: 'published',
    }));

  // 草稿：从数据库读取
  const drafts = await getDraftsFromDb();
  for (const draft of drafts) {
    if (draft.status === 'draft' && !draft.content) {
      const fileContent = await getDraft(draft.id);
      draft.content = fileContent ?? '';
    }
  }

    // 合并，按日期降序
    const all = [
      ...published,
      ...drafts.map((d) => ({ ...d, status: 'draft' })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    logger.info('GET', '获取文章列表成功', { count: all.length });
    return NextResponse.json(all);
  } catch (error) {
    logger.error('GET', '获取文章列表失败', { error: (error as Error).message });
    return NextResponse.json({ error: '获取文章列表失败' }, { status: 500 });
  }
}

/**
 * 构建文章 frontMatter 对象
 */
function buildPostFrontMatter(fields: {
  title: string;
  author: string;
  date: string;
  tags: string[];
  coverImage?: string;
  description?: string;
}): Record<string, unknown> {
  const fm: Record<string, unknown> = { title: fields.title, author: fields.author, date: fields.date, tags: fields.tags };
  if (fields.coverImage) fm.cover = fields.coverImage;
  if (fields.description) fm.description = fields.description;
  return fm;
}

interface ArticleMetaForPublish {
  id: string;
  title: string;
  authorName: string;
  tags: string[];
}

/**
 * 将已发布文章推送到 GitHub 并更新数据库
 */
async function handlePublishedPost(
  req: NextRequest,
  articleMeta: ArticleMetaForPublish,
  content: string,
  meta: {
    coverImage: string;
    description: string;
    slug: string | undefined;
    now: string;
  },
) {
  const postSlug = meta.slug ?? `/${articleMeta.authorName}/${articleMeta.id}`;
  const filePath = `posts${postSlug}.md`;

  const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      path: filePath,
      frontMatter: buildPostFrontMatter({
        title: articleMeta.title,
        author: articleMeta.authorName,
        date: meta.now,
        tags: articleMeta.tags,
        coverImage: meta.coverImage,
        description: meta.description,
      }),
      body: content || '',
      message: `feat: publish post "${articleMeta.title}"`,
    }),
  });

  if (!ghResponse.ok) {
    const error = await ghResponse.json();
    return NextResponse.json({ error: error.error ?? '发布到 GitHub 失败' }, { status: 500 });
  }

  const db = getDb();
  const backupMeta = { ...articleMeta, status: 'published', content: '', slug: postSlug };
  await db.set(`article:data:${articleMeta.id}`, JSON.stringify(backupMeta));
  await db.hset('articles:published', articleMeta.id, JSON.stringify(backupMeta));

  return NextResponse.json({ success: true, id: articleMeta.id, slug: postSlug });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    logger.warn('POST', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { title, content, tags, coverImage, status, slug, description } = await req.json();
    logger.info('POST', '创建文章', { title, status });
    const id = `draft-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const articleMeta = {
      id,
      title,
      content: content ?? '',
      authorId: session.uid,
      authorName: session.email.split('@')[0] ?? 'unknown',
      tags: tags ?? [],
      coverImage: coverImage ?? '',
      description: description ?? '',
      status: status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    };

    if (status === 'published') {
      return handlePublishedPost(req, articleMeta, content, { coverImage, description, slug, now });
    }

    const db = getDb();
    if (content) {
      await saveDraft(id, content);
    }
    const draftMeta = { ...articleMeta, content: '' };
    await db.set(`article:data:${id}`, JSON.stringify(draftMeta));
    await db.hset('articles:drafts', id, JSON.stringify(draftMeta));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    logger.error('POST', '创建文章失败', { error: (error as Error).message });
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 });
  }
}
