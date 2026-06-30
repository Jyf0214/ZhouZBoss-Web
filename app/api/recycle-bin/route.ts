import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DELETION_PERIOD_DAYS } from '@/lib/constants';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/recycle-bin');

/**
 * Recycle Bin API
 * - GET: List all articles pending deletion
 * - POST: Restore an article
 * - DELETE: Permanently delete an article
 */

export const GET = apiHandler('GET', { label: '读取回收站', requireAuth: true }, async (req) => {
  const session = (await getSession())!;
  logger.info('GET', '读取回收站列表');
  const db = getDb();
  const index = await db.hgetall('articles:index');

  const pendingDeletion: Record<string, unknown>[] = [];
  const allArticles: Record<string, unknown>[] = [];

  for (const [id, data] of Object.entries(index)) {
    let article: Record<string, unknown>;
    try {
      article = JSON.parse(data);
    } catch {
      logger.warn('GET', '跳过无法解析的文章记录', { id });
      continue;
    }
    if (session.role === 'sudo' || session.role === 'admin') {
      allArticles.push({ id, ...article });
      if (article.status === 'pending_deletion') {
        pendingDeletion.push({ id, ...article });
      }
    } else if (article.authorId === session.uid && article.status === 'pending_deletion') {
      pendingDeletion.push({ id, ...article });
    }
  }

  // Calculate days remaining for deletion
  const now = Date.now();
  const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  const enrichedPending = pendingDeletion.map(article => {
    const requestedAtMs = article.deletionRequestedAt
      ? new Date(article.deletionRequestedAt as string).getTime()
      : NaN;
    if (Number.isNaN(requestedAtMs)) {
      return { ...article, daysRemaining: 0, expiresAt: new Date().toISOString(), canRestore: false };
    }
    const expiresAt = requestedAtMs + periodMs;
    const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
    const canRestore = daysRemaining > 0;

    return {
      ...article,
      daysRemaining,
      expiresAt: new Date(expiresAt).toISOString(),
      canRestore,
    };
  });

  if (req.nextUrl.searchParams.get('all') === 'true' && (session.role === 'admin' || session.role === 'sudo')) {
    return NextResponse.json(allArticles);
  }

  return NextResponse.json(enrichedPending);
});

/**
 * Restore an article from recycle bin
 */
export const POST = apiHandler('POST', { label: '恢复文章', requireAdmin: true }, async (req) => {
  logger.info('POST', '恢复文章');
  const { id } = await req.json();
  if (!id) {
    logger.warn('POST', '缺少文章ID');
    return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
  }

  const db = getDb();
  const articleStr = await db.get(`article:data:${id}`);
  if (!articleStr) {
    logger.warn('POST', '文章不存在', { id });
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const article = JSON.parse(articleStr);
  if (article.status !== 'pending_deletion') {
    logger.warn('POST', '文章不在回收站中', { id, status: article.status });
    return NextResponse.json({ error: 'Article is not in recycle bin' }, { status: 400 });
  }

  // Check if still within restoration period
  const now = Date.now();
  const requestedAt = new Date(article.deletionRequestedAt).getTime();
  const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  if (now > requestedAt + periodMs) {
    logger.warn('POST', '恢复期已过期', { id });
    return NextResponse.json({ error: 'Restoration period expired' }, { status: 400 });
  }

  // Restore article
  const restored = {
    ...article,
    status: 'draft',
    deletionRequestedAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  await db.set(`article:data:${id}`, JSON.stringify(restored));
  await db.hset('articles:index', id, JSON.stringify(restored));
  // 恢复后写入草稿索引，确保文章列表可见
  await db.hset('articles:drafts', id, JSON.stringify(restored));

  logger.info('POST', '文章恢复成功', { id });
  return NextResponse.json({ success: true, message: 'Article restored' });
});

/**
 * Permanently delete an article from recycle bin
 */
export const DELETE = apiHandler('DELETE', { label: '永久删除文章', requireAdmin: true }, async (req) => {
  const session = (await getSession())!;
  logger.info('DELETE', '永久删除文章');
  const { id } = await req.json();
  if (!id) {
    logger.warn('DELETE', '缺少文章ID');
    return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
  }

  const db = getDb();
  const articleStr = await db.get(`article:data:${id}`);
  if (!articleStr) {
    logger.warn('DELETE', '文章不存在', { id });
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const article = JSON.parse(articleStr);

  // Only delete if in pending_deletion status or user is sudo
  if (article.status !== 'pending_deletion' && session.role !== 'sudo') {
    logger.warn('DELETE', '无法删除此文章', { id, status: article.status, role: session.role });
    return NextResponse.json({ error: 'Cannot delete this article' }, { status: 400 });
  }

  // Permanently delete
  await db.del(`article:data:${id}`);
  await db.hdel('articles:index', id);
  await db.hdel('articles:drafts', id);
  await db.del(`file:articles/${id}.md`);

  logger.info('DELETE', '永久删除成功', { id });
  return NextResponse.json({ success: true, message: 'Permanently deleted' });
});
