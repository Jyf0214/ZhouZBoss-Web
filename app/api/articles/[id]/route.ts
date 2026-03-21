import { NextRequest, NextResponse } from 'next/server';
import { getDb, storage } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Article Detail API (GET, PATCH, DELETE)
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    const articleStr = await db.get(`article:data:${id}`);
    if (!articleStr) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(articleStr));
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    
    const articleStr = await db.get(`article:data:${id}`);
    if (!articleStr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const article = JSON.parse(articleStr);
    
    // Check ownership or sudo
    if (article.authorId !== session.uid && session.role !== 'admin' && session.role !== 'sudo') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = { ...article, ...body, updatedAt: new Date().toISOString() };
    
    // Update data, index and storage
    await db.set(`article:data:${id}`, JSON.stringify(updated));
    const { content: _, ...metadata } = updated;
    await db.hset('articles:index', id, JSON.stringify(metadata));
    
    if (body.content) {
      await storage.saveFile(`articles/${id}.md`, body.content);
    }

    // Sync to GitHub if published
    if (updated.status === 'published') {
      const configStr = await db.get('config:main');
      if (configStr) {
        const { syncArticleToGithub } = await import('@/lib/github');
        const config = JSON.parse(configStr);
        if (config.githubRepo && config.githubToken) {
          await syncArticleToGithub(config.githubRepo, config.githubToken, updated);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb();
    const articleStr = await db.get(`article:data:${id}`);
    if (!articleStr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const article = JSON.parse(articleStr);

    // If user is sudo, immediate delete or confirm deletion
    if (session.role === 'admin' || session.role === 'sudo') {
      await db.del(`article:data:${id}`);
      await db.hdel('articles:index', id);
      await db.del(`file:articles/${id}.md`);
      return NextResponse.json({ success: true, message: 'Permanently deleted by admin' });
    }

    // Normal user: Request deletion (30-day buffer)
    if (article.authorId !== session.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deletionInfo = {
      ...article,
      status: 'pending_deletion',
      deletionRequestedAt: new Date().toISOString(),
    };

    await db.set(`article:data:${id}`, JSON.stringify(deletionInfo));
    await db.hset('articles:index', id, JSON.stringify(deletionInfo));

    return NextResponse.json({ 
      success: true, 
      message: 'Deletion requested. Admin has 30 days to confirm.' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
