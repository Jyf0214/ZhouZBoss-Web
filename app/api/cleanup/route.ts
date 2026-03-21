import { NextRequest, NextResponse } from 'next/server';
import { getDb, storage } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Cleanup Cron Job API
 * Automatically deletes articles that have been in pending_deletion status for more than 30 days
 * 
 * This should be called periodically (e.g., daily) by a cron scheduler
 */

const DELETION_PERIOD_DAYS = 30;

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      } catch (error: any) {
        errors.push(`Error processing article ${id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deleted.length} articles.`,
      deleted,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      pendingDeletion,
      expiringSoon,
      expired,
      deletionPeriodDays: DELETION_PERIOD_DAYS,
    });
  } catch (error: any) {
    console.error('Cleanup stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
