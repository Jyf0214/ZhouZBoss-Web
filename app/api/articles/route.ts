import { NextRequest, NextResponse } from 'next/server';
import { getDb, storage } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { syncArticleToGithub } from '@/lib/github';

/**
 * Articles API
 */

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const index = await db.hgetall('articles:index');
    
    const articles = Object.entries(index).map(([id, data]) => ({
      id,
      ...JSON.parse(data),
    }));

    // Sort by date desc
    articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(articles);
  } catch (error) {
    console.error('List articles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, tags, coverImage, status } = await req.json();
    const id = `art-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const articleData = {
      id,
      title,
      content, // Full content stored in JSON for indexing (Base64 is separate)
      authorId: session.uid,
      authorName: session.email.split('@')[0],
      tags: tags || [],
      coverImage: coverImage || '',
      status: status || 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const db = getDb();
    
    // 1. Save full record to DB
    await db.set(`article:data:${id}`, JSON.stringify(articleData));
    
    // 2. Update index
    const { content: _, ...metadata } = articleData; // Don't store full content in index
    await db.hset('articles:index', id, JSON.stringify(metadata));
    
    // 3. Store as Base64 in storage layer (Redis)
    await storage.saveFile(`articles/${id}.md`, content);

    // 4. Sync to GitHub if published
    if (status === 'published') {
      // Get GitHub config from DB/env
      const configStr = await db.get('config:main');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.githubRepo && config.githubToken) {
          await syncArticleToGithub(config.githubRepo, config.githubToken, articleData);
        }
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
