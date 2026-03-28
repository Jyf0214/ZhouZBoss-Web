import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
    const db = getDb();

    // Find user by username (email prefix or custom slug)
    let userStr = await db.get(`user:username:${username}`);
    if (!userStr) {
      // Try to find by UID directly
      const directUser = await db.get(`user:uid:${username}`);
      if (!directUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userStr = directUser;
    }

    const user = JSON.parse(userStr);

    // Find article by ID
    const articleStr = await db.get(`article:data:${articleId}`);
    if (!articleStr) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = JSON.parse(articleStr);

    // Check if article belongs to this user
    if (article.authorId !== user.uid) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if article is published
    if (article.status !== 'published') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: article.id,
      title: article.title,
      authorName: article.authorName,
      content: article.content,
      tags: article.tags || [],
      coverImage: article.coverImage || '',
      createdAt: article.createdAt,
      status: article.status,
    });
  } catch (error) {
    console.error('User article API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
