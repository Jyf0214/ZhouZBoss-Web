import { NextRequest, NextResponse } from 'next/server';
import { getDb, storage } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/u/[username]/[articleId]');

/**
 * Dynamic User Article Route API
 * GET /api/u/[username]/[articleId]
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; articleId: string }> }
) {
  try {
    const { username, articleId } = await params;
    logger.info('GET', '读取用户文章', { username, articleId });
    const db = getDb();
    const config = loadConfig();

    // Find user by username (email prefix or custom slug)
    let userStr = await db.get(`user:username:${username}`);
    if (!userStr) {
      // Try to find by UID directly
      const directUser = await db.get(`user:uid:${username}`);
      if (!directUser) {
        logger.warn('GET', '用户不存在', { username });
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userStr = directUser;
    }

    const user = JSON.parse(userStr);

    // Get avatar from config
    const avatar = config.users?.[user.uid]?.avatar || config.auth?.admin?.avatar || null;

    // Find article by ID
    const articleStr = await db.get(`article:data:${articleId}`);
    if (!articleStr) {
      logger.warn('GET', '文章不存在', { articleId });
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = JSON.parse(articleStr);

    // Check if article belongs to this user
    if (article.authorId !== user.uid) {
      logger.warn('GET', '文章不属于该用户', { articleId, authorId: article.authorId, uid: user.uid });
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if article is published
    if (article.status !== 'published') {
      logger.warn('GET', '文章未发布', { articleId, status: article.status });
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // 读取原始 Markdown 文件（包含 Front Matter）
    let rawContent = '';
    try {
      const raw = await storage.getFile(`articles/${articleId}.md`);
      if (raw) {
        rawContent = raw;
      }
    } catch {
      // 读取原始文件失败时设为空字符串，不影响主流程
      rawContent = '';
    }

    logger.info('GET', '文章读取成功', { articleId });
    return NextResponse.json({
      id: article.id,
      title: article.title,
      authorName: article.authorName,
      content: article.content,
      rawContent,
      tags: article.tags || [],
      coverImage: article.coverImage || '',
      createdAt: article.createdAt,
      status: article.status,
      user: {
        uid: user.uid,
        name: user.name,
        avatar,
      }
    });
  } catch (error) {
    logger.error('GET', '用户文章API错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
