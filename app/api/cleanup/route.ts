import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DELETION_PERIOD_DAYS } from '@/lib/constants';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/cleanup');

/**
 * Cleanup Cron Job API
 * Automatically deletes articles that have been in pending_deletion status for more than 30 days
 *
 * This should be called periodically (e.g., daily) by a cron scheduler
 */

export async function POST(req: NextRequest) {
  try {
    // Check for admin/sudo or cron secret
    const session = await getSession();
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    const isAuthorized = 
      (session && (session.role === 'admin' || session.role === 'sudo')) ||
      (cronSecret && expectedSecret && cronSecret === expectedSecret);
    
    if (!isAuthorized) {
      logger.warn('POST', '未授权');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('POST', '执行清理任务');
    const db = getDb();
    const index = await db.hgetall('articles:index');
    
    const now = Date.now();
    const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    
    const deleted: string[] = [];
    const errors: string[] = [];

    for (const [id, data] of Object.entries(index)) {
      try {
        const article = JSON.parse(data);
        
        if (article.status === 'pending_deletion' && article.deletionRequestedAt) {
          const requestedAt = new Date(article.deletionRequestedAt).getTime();
          
          // Check if deletion period has expired
          if (now > requestedAt + periodMs) {
            // Permanently delete
            await db.del(`article:data:${id}`);
            await db.hdel('articles:index', id);
            await db.del(`file:articles/${id}.md`);
            deleted.push(id);
          }
      }
      } catch (error: unknown) {
      errors.push(`Error processing article ${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    logger.info('POST', '清理任务完成', { deletedCount: deleted.length, errorCount: errors.length });
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deleted.length} articles.`,
      deleted,
      errors,
      timestamp: new Date().toISOString(),
  });
  } catch (error: unknown) {
  logger.error('POST', '清理任务失败', { error: error instanceof Error ? error.message : String(error) });
  return NextResponse.json({
  error: 'Internal server error',
  details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Get cleanup statistics
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
      logger.warn('GET', '未授权');
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
      const article = JSON.parse(data);
      
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
  logger.error('GET', '获取清理统计失败', { error: error instanceof Error ? error.message : String(error) });
  return NextResponse.json({
  error: 'Internal server error',
  details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
