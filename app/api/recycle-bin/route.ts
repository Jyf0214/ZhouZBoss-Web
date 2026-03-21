import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession, requireAdmin } from '@/lib/auth';

/**
 * Recycle Bin API
 * - GET: List all articles pending deletion
 * - POST: Restore an article
 * - DELETE: Permanently delete an article
 */

const DELETION_PERIOD_DAYS = 30;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const index = await db.hgetall('articles:index');
    
    const pendingDeletion: any[] = [];
    const allArticles: any[] = [];

    for (const [id, data] of Object.entries(index)) {
      const article = JSON.parse(data);
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
      const requestedAt = new Date(article.deletionRequestedAt).getTime();
      const expiresAt = requestedAt + periodMs;
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
  } catch (error) {
    console.error('Recycle bin GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Restore an article from recycle bin
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
    }

    const db = getDb();
    const articleStr = await db.get(`article:data:${id}`);
    if (!articleStr) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = JSON.parse(articleStr);
    if (article.status !== 'pending_deletion') {
      return NextResponse.json({ error: 'Article is not in recycle bin' }, { status: 400 });
    }

    // Check if still within restoration period
    const now = Date.now();
    const requestedAt = new Date(article.deletionRequestedAt).getTime();
    const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    
    if (now > requestedAt + periodMs) {
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

    return NextResponse.json({ success: true, message: 'Article restored' });
  } catch (error) {
    console.error('Restore article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Permanently delete an article from recycle bin
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
    }

    const db = getDb();
    const articleStr = await db.get(`article:data:${id}`);
    if (!articleStr) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = JSON.parse(articleStr);

    // Only delete if in pending_deletion status or user is sudo
    if (article.status !== 'pending_deletion' && session.role !== 'sudo') {
      return NextResponse.json({ error: 'Cannot delete this article' }, { status: 400 });
    }

    // Permanently delete
    await db.del(`article:data:${id}`);
    await db.hdel('articles:index', id);
    await db.del(`file:articles/${id}.md`);

    return NextResponse.json({ success: true, message: 'Permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
