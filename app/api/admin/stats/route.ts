import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { getContentFiles } from '@/lib/content';
import { getDb } from '@/lib/db';

/** 清除 Markdown 标记，统计有效字符数 */
function countChars(text: string): number {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,3}/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

/** 从 slug 提取分类（第一级目录名） */
function extractCategory(slug: string): string {
  const parts = slug.split('/').filter(Boolean);
  return parts.length > 1 ? (parts[0] ?? '未分类') : '根目录';
}

export const GET = apiHandler('GET', { label: '内容统计', requireAdmin: true }, async () => {
  // API 密钥权限检查
  const authResult = await getSessionWithKeyId();
  if (authResult) {
    const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'stats_read');
    if (permErr) return permErr;
  }

  const posts = getContentFiles('posts');
  const faces = getContentFiles('faces');

  // 日记存储在 Prisma 数据库中，不在本地文件
  const db = getDb();
  let diaryCount = 0;
  try {
    const prisma = db.prisma;
    if (prisma) {
      diaryCount = await prisma.diary.count();
    }
  } catch { diaryCount = 0; }

  // --- 标签分布 ---
  const tagCount = new Map<string, number>();
  for (const file of [...posts, ...faces]) {
    const tags = file.meta.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === 'string' && tag.trim()) {
          tagCount.set(tag.trim(), (tagCount.get(tag.trim()) ?? 0) + 1);
        }
      }
    }
  }
  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // --- 分类文章数量 ---
  const categoryCount = new Map<string, number>();
  for (const file of posts) {
    const cat = extractCategory(file.slug);
    categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
  }
  const categories = [...categoryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // --- 字数统计 ---
  let totalWordCount = 0;
  for (const file of [...posts, ...faces]) {
    totalWordCount += countChars(file.content);
  }
  const avgPostWordCount = posts.length > 0
    ? Math.round(posts.reduce((sum, f) => sum + countChars(f.content), 0) / posts.length)
    : 0;

  // --- 最近发布时间 ---
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const last7Days = posts.filter(f => f.meta.date && (now - new Date(f.meta.date).getTime()) < 7 * DAY).length;
  const last30Days = posts.filter(f => f.meta.date && (now - new Date(f.meta.date).getTime()) < 30 * DAY).length;

  // --- 最近 10 篇文章（按时间线） ---
  const recentPosts = posts
    .filter(f => f.meta.date)
    .slice(0, 10)
    .map(f => ({
      title: f.meta.title,
      date: f.meta.date!,
      slug: f.slug,
      wordCount: countChars(f.content),
    }));

  return NextResponse.json({
    counts: {
      posts: posts.length,
      diary: diaryCount,
      faces: faces.length,
      total: posts.length + diaryCount + faces.length,
    },
    topTags,
    categories,
    wordCount: {
      total: totalWordCount,
      avgPost: avgPostWordCount,
    },
    timeline: {
      last7Days,
      last30Days,
    },
    recentPosts,
  });
});
