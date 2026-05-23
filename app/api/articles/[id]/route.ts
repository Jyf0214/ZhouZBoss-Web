import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { loadConfig, canAccess, hasDatabase, type AppConfig } from '@/lib/config';
import { getDraft, saveDraft, deleteDraft } from '@/lib/draft-storage';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/articles/[id]');

/**
 * Article Detail API (GET, PATCH, DELETE)
 *
 * - GET：草稿从数据库读内容，已发布通过 /api/github GET 端点读取
 * - PATCH：发布时通过 /api/github POST 端点推送 GitHub；草稿更新存数据库
 * - DELETE：通过 /api/github POST 端点删除 GitHub 文件 + 数据库记录
 */

async function handleDraftArticleResponse(
  id: string,
  meta: Record<string, unknown>,
): Promise<NextResponse> {
  if (!meta.content) {
    const fileContent = await getDraft(id);
    meta.content = fileContent ?? '';
  }
  return NextResponse.json(meta);
}

async function handlePublishedArticleResponse(
  meta: Record<string, unknown>,
  req: NextRequest,
): Promise<NextResponse | null> {
  if (!(meta.status === 'published' && meta.slug)) {
    return null;
  }
  const ghResponse = await fetch(
    `${req.nextUrl.origin}/api/github?path=posts${String(meta.slug)}.md`,
  );
  if (!ghResponse.ok) {
    return null;
  }
  const { frontMatter, body } = await ghResponse.json();
  return NextResponse.json({
    ...meta,
    title: frontMatter.title ?? meta.title,
    content: body ?? '',
    author: frontMatter.author ?? meta.authorName,
    tags: frontMatter.tags ?? meta.tags ?? [],
    cover: frontMatter.cover ?? meta.coverImage,
    description: frontMatter.description ?? meta.description,
    date: frontMatter.date ?? meta.createdAt,
  });
}

async function handleFileSystemLookup(
  id: string,
  isAuthenticated: boolean,
  dbAvailable: boolean,
  config: AppConfig,
): Promise<NextResponse | null> {
  const { getContentFile } = await import('@/lib/content');
  const slug = id.startsWith('/') ? id : `/${id}`;
  const file = getContentFile('posts', slug);
  if (!file) {
    return null;
  }
  if (!canAccess('posts', file.slug, isAuthenticated, dbAvailable, config)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({
    id: file.slug,
    slug: file.slug,
    title: file.meta.title,
    content: file.content,
    author: file.meta.author,
    date: file.meta.date,
    tags: file.meta.tags ?? [],
    cover: file.meta.cover,
    description: file.meta.description,
    status: 'published',
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  logger.info('GET', '获取文章详情', { id });

  try {
    logger.info('GET', '读取文章详情', { id });
    const db = getDb();

    const metaStr = await db.get(`article:data:${id}`);
    if (metaStr) {
      const meta = JSON.parse(metaStr) as Record<string, unknown>;
      if (meta.status === 'draft') {
        return handleDraftArticleResponse(id, meta);
      }
      const publishedResponse = await handlePublishedArticleResponse(meta, req);
      if (publishedResponse) {
        return publishedResponse;
      }
      return NextResponse.json(meta);
    }

    const session = await getSession();
    const isAuthenticated = !!session;
    const config = loadConfig();
    const dbAvailable = hasDatabase();
    const fileResponse = await handleFileSystemLookup(id, isAuthenticated, dbAvailable, config);
    if (fileResponse) {
      return fileResponse;
    }

    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  } catch (error) {
    logger.error('GET', '获取文章失败', { error: (error as Error).message });
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 });
  }
}

function checkArticlePermission(
  meta: Record<string, unknown>,
  session: { uid: string; role: string },
): boolean {
  if (meta.authorId !== session.uid && session.role !== 'admin' && session.role !== 'sudo') {
    logger.warn('PATCH', '无权限', { id: meta.id as string, uid: session.uid });
    return false;
  }
  return true;
}

async function handlePublishArticle(
  body: Record<string, unknown>,
  updated: Record<string, unknown>,
  id: string,
  req: NextRequest,
  db: ReturnType<typeof getDb>,
): Promise<NextResponse> {
  const postSlug = (body.slug as string) || (updated.slug as string) || `/${String(updated.authorName)}/${id}`;
  const filePath = `posts${postSlug}.md`;

  const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      path: filePath,
      frontMatter: {
        title: updated.title,
        author: updated.authorName,
        date: updated.createdAt,
        tags: (updated.tags as string[]) || [],
        ...(updated.coverImage ? { cover: updated.coverImage } : {}),
        ...(updated.description ? { description: updated.description } : {}),
      },
      body: (updated.content as string) || '',
      message: `feat: publish post "${String(updated.title)}"`,
    }),
  });

  if (!ghResponse.ok) {
    const error = await ghResponse.json() as { error?: string };
    return NextResponse.json({ error: error.error ?? '发布到 GitHub 失败' }, { status: 500 });
  }

  updated.status = 'published';
  updated.slug = postSlug;
  updated.content = '';
  await db.set(`article:data:${id}`, JSON.stringify(updated));
  await db.hset('articles:published', id, JSON.stringify(updated));
  await db.hdel('articles:drafts', id);

  return NextResponse.json({ success: true, slug: postSlug });
}

async function handleDraftSave(
  body: Record<string, unknown>,
  meta: Record<string, unknown>,
  id: string,
  db: ReturnType<typeof getDb>,
): Promise<NextResponse> {
  const updated: Record<string, unknown> = {
    ...meta,
    ...body,
    content: body.content !== undefined ? body.content : meta.content,
    updatedAt: new Date().toISOString(),
  };

  if (updated.content) {
    await saveDraft(id, updated.content as string);
  }
  updated.content = '';
  await db.set(`article:data:${id}`, JSON.stringify(updated));
  await db.hset('articles:drafts', id, JSON.stringify(updated));

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    logger.warn('PATCH', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    logger.info('PATCH', '更新文章', { id });
    const db = getDb();
    const metaStr = await db.get(`article:data:${id}`);

    if (!metaStr) {
      logger.warn('PATCH', '文章不存在', { id });
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const meta = JSON.parse(metaStr) as Record<string, unknown>;

    if (!checkArticlePermission(meta, session)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    if (body.status === 'published') {
      const updated = {
        ...meta,
        ...body,
        content: body.content !== undefined ? body.content : meta.content,
        updatedAt: new Date().toISOString(),
      };
      return handlePublishArticle(body, updated, id, req, db);
    }

    return handleDraftSave(body, meta, id, db);
  } catch (error) {
    logger.error('PATCH', '更新文章失败', { error: (error as Error).message });
    return NextResponse.json({ error: '更新文章失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    logger.warn('DELETE', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    logger.info('DELETE', '删除文章', { id });
    const db = getDb();
    const metaStr = await db.get(`article:data:${id}`);

    if (!metaStr) {
      logger.warn('DELETE', '文章不存在', { id });
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const meta = JSON.parse(metaStr);

    // 管理员直接永久删除
    if (session.role === 'admin' || session.role === 'sudo') {
      // 删除 GitHub 文件（通过 /api/github POST 端点）
      if (meta.status === 'published' && meta.slug) {
        await fetch(`${req.nextUrl.origin}/api/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            path: `posts${meta.slug}.md`,
            message: `delete: remove post "${meta.title}"`,
          }),
        });
      }

      // 删除数据库记录
      await db.del(`article:data:${id}`);
      await db.hdel('articles:drafts', id);
      await db.hdel('articles:published', id);

      // 清理草稿文件
      try {
        await deleteDraft(id);
      } catch {
        // 文件清理失败不影响删除流程
      }

      return NextResponse.json({ success: true, message: '已永久删除' });
    }

    // 普通用户：进入删除队列
    if (meta.authorId !== session.uid) {
      logger.warn('DELETE', '无权限', { id, authorId: meta.authorId, uid: session.uid });
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const deletionInfo = {
      ...meta,
      status: 'pending_deletion',
      deletionRequestedAt: new Date().toISOString(),
    };
    await db.set(`article:data:${id}`, JSON.stringify(deletionInfo));
    await db.hdel('articles:drafts', id);
    await db.hset('articles:drafts', id, JSON.stringify(deletionInfo));

    return NextResponse.json({ success: true, message: '已提交删除申请，30天后自动删除' });
  } catch (error) {
    logger.error('DELETE', '删除文章失败', { error: (error as Error).message });
    return NextResponse.json({ error: '删除文章失败' }, { status: 500 });
  }
}
