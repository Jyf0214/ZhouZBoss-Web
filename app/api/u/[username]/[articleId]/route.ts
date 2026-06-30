import { type NextRequest, NextResponse } from 'next/server';
import { getDb, storage } from '@/lib/db';
import { loadConfig, type AppConfig } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/u/[username]/[articleId]');

/**
 * Dynamic User Article Route API
 * GET /api/u/[username]/[articleId]
 */

async function findArticleUser(
  db: ReturnType<typeof getDb>,
  username: string,
): Promise<Record<string, unknown> | null> {
  const userStr = await db.get(`user:username:${username}`);
  const raw = userStr ?? await db.get(`user:uid:${username}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getUserAvatar(config: AppConfig, user: Record<string, unknown>): string | null {
  const avatar = config.users?.[String(user.uid)]?.avatar ?? config.auth?.admin?.avatar;
  return avatar ?? null;
}

async function getRawMarkdownContent(articleId: string): Promise<string> {
  try {
    const raw = await storage.getFile(`articles/${articleId}.md`);
    return raw ?? '';
  } catch {
    return '';
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; articleId: string }> }
) {
  try {
    const { username, articleId } = await params;
    logger.info('GET', '读取用户文章', { username, articleId });
    const db = getDb();
    const config = loadConfig();

    const user = await findArticleUser(db, username);
    if (!user) {
      logger.warn('GET', '用户不存在', { username });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const avatar = getUserAvatar(config, user);

    const articleStr = await db.get(`article:data:${articleId}`);
    if (!articleStr) {
      logger.warn('GET', '文章不存在', { articleId });
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const article = JSON.parse(articleStr) as Record<string, unknown>;

    if (article.authorId !== user.uid) {
      logger.warn('GET', '文章不属于该用户', { articleId, authorId: article.authorId, uid: user.uid });
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    if (article.status !== 'published') {
      logger.warn('GET', '文章未发布', { articleId, status: article.status });
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const rawContent = await getRawMarkdownContent(articleId);

    logger.info('GET', '文章读取成功', { articleId });
    return NextResponse.json({
      id: article.id,
      title: article.title,
      authorName: article.authorName,
      content: article.content,
      rawContent,
      tags: article.tags ?? [],
      coverImage: article.coverImage ?? '',
      createdAt: article.createdAt,
      status: article.status,
      user: {
        uid: user.uid as string,
        name: user.name as string,
        avatar,
      }
    });
  } catch (error) {
    logger.error('GET', '用户文章API错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
