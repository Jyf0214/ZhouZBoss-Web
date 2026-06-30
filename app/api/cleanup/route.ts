import { type NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';
import { DELETION_PERIOD_DAYS } from '@/lib/constants';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/cleanup');

/**
 * Cleanup Cron Job API
 * Automatically deletes articles that have been in pending_deletion status for more than 30 days
 *
 * This should be called periodically (e.g., daily) by a cron scheduler
 */

async function isCleanupAuthorized(req: NextRequest): Promise<boolean> {
  const session = await getSession();
  if (session && (session.role === 'admin' || session.role === 'sudo')) {
    return true;
  }
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (!cronSecret || !expectedSecret) return false;
  try {
    return timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedSecret));
  } catch {
    return false;
  }
}

/** 尝试删除 GitHub 上的文章文件 */
async function tryDeleteGithubFile(slug: string, title: string, id: string): Promise<void> {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) return;
  const [owner = '', repo = ''] = env.githubRepo.split('/');
  const { Octokit } = await import('octokit');
  const octokit = new Octokit({ auth: env.githubToken });
  const filePath = `posts${slug}.md`;
  const resp = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
  if ('sha' in resp.data) {
    await octokit.rest.repos.deleteFile({
      owner, repo, path: filePath,
      message: `cleanup: delete expired article "${title || id}"`,
      sha: resp.data.sha,
    });
  }
}

/** 判断文章是否已过期并执行清理 */
async function cleanupExpiredArticle(
  id: string,
  data: string,
  db: ReturnType<typeof getDb>,
  now: number,
  periodMs: number,
): Promise<boolean> {
  const article = JSON.parse(data);
  if (article.status !== 'pending_deletion' || !article.deletionRequestedAt) return false;
  const requestedAt = new Date(article.deletionRequestedAt).getTime();
  if (now <= requestedAt + periodMs) return false;

  if (article.slug && typeof article.slug === 'string') {
    await tryDeleteGithubFile(article.slug, article.title ?? '', id);
  }
  await db.del(`article:data:${id}`);
  await db.hdel('articles:index', id);
  await db.hdel('articles:published', id);
  await db.hdel('articles:drafts', id);
  await db.del(`file:articles/${id}.md`);
  return true;
}

export const POST = apiHandler('POST', { label: '清理过期文章' }, async (req: NextRequest) => {
  if (!(await isCleanupAuthorized(req))) {
    logger.warn('POST', '未授权');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('POST', '开始清理过期文章');
  const db = getDb();
  const index = await db.hgetall('articles:index');

  const now = Date.now();
  const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  const deleted: string[] = [];
  const errors: string[] = [];

  for (const [id, data] of Object.entries(index)) {
    try {
      const deleted_art = await cleanupExpiredArticle(id, data, db, now, periodMs);
      if (deleted_art) deleted.push(id);
    } catch (error: unknown) {
      console.error(`[cleanup] 处理文章 ${id} 失败:`, error);
      errors.push('处理失败');
    }
  }

  logger.info('POST', '清理任务完成', { deletedCount: deleted.length, errorCount: errors.length });
  return NextResponse.json({
    success: true,
    message: `Cleanup completed. Deleted ${deleted.length} articles.`,
    deletedCount: deleted.length,
    errorCount: errors.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get cleanup statistics
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
      logger.warn('GET', '未授权', { role: session?.role });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('GET', '获取清理统计');
    const db = getDb();
    const index = await db.hgetall('articles:index');

    const now = Date.now();
    const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

    let pendingDeletion = 0;
    let expiringSoon = 0; // Within 7 days
    let expired = 0;

    for (const [, data] of Object.entries(index)) {
      let article;
      try {
        article = JSON.parse(data);
      } catch (error: unknown) {
        console.error('[cleanup] 解析文章数据失败:', error);
        continue;
      }

      if (article.status === 'pending_deletion' && article.deletionRequestedAt) {
        pendingDeletion++;

        const requestedAt = new Date(article.deletionRequestedAt).getTime();
        const expiresAt = requestedAt + periodMs;
        const daysRemaining = (expiresAt - now) / (24 * 60 * 60 * 1000);

        if (daysRemaining <= 0) {
          expired++;
        } else if (daysRemaining <= 7) {
          expiringSoon++;
        }
      }
    }

    logger.info('GET', '清理统计获取成功', { pendingDeletion, expiringSoon, expired });
    return NextResponse.json({
      pendingDeletion,
      expiringSoon,
      expired,
      deletionPeriodDays: DELETION_PERIOD_DAYS,
    });
  } catch (error: unknown) {
    logger.error('GET', '获取清理统计错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '获取清理统计失败' }, { status: 500 });
  }
}
