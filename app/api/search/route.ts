import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getSession } from '@/lib/auth';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { canAccess, loadConfig, hasDatabase } from '@/lib/config';

const logger = createApiLogger('/api/search');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  tags: string[];
  slug: string;
  matchPreview: string;
  type: 'post' | 'diary';
}

export interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** 提取匹配关键词附近的上下文摘要 */
function extractMatchPreview(content: string, query: string, maxChars = 160): string {
  const lower = content.toLowerCase();
  const qLower = query.toLowerCase();
  const index = lower.indexOf(qLower);

  if (index === -1) {
    // 没有内容匹配，返回开头预览
    return content.slice(0, maxChars);
  }

  const half = Math.floor((maxChars - query.length) / 2);
  const start = Math.max(0, index - half);
  const end = Math.min(content.length, index + query.length + half);

  let preview = content.slice(start, end);
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';
  return preview;
}

/** 计算相关性分数 */
function calcRelevance(title: string, description: string, tags: string[], _content: string, query: string): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  let score = 0;

  // 标题完全匹配
  if (t === q) score += 50;
  // 标题包含
  else if (t.includes(q)) score += 30;
  // 标题开头匹配
  else if (t.startsWith(q)) score += 40;

  // 标签匹配
  if (tags.some((tag) => tag.toLowerCase().includes(q))) score += 15;
  if (tags.some((tag) => tag.toLowerCase() === q)) score += 20;

  // 描述匹配
  if (d.includes(q)) score += 10;
  if (d.startsWith(q)) score += 15;

  // 长度惩罚：标题较短的优先
  score -= title.length * 0.1;

  return score;
}

const POSTS_DIR = path.join(/* @__PURE__ */ process.cwd(), 'posts');

// ─── Search Functions ──────────────────────────────────────────────────────

/**
 * 递归扫描 posts 目录，搜索匹配的文章
 */
function searchPostsDirectory(
  dir: string,
  baseDir: string,
  query: string,
  isAuthenticated: boolean,
  dbAvailable: boolean,
  tagFilter?: string,
): SearchResult[] {
  const results: SearchResult[] = [];
  const config = loadConfig();

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(
        ...searchPostsDirectory(fullPath, baseDir, query, isAuthenticated, dbAvailable, tagFilter),
      );
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relative = path.relative(baseDir, fullPath);
      const slug = '/' + relative.replace(/\.md$/, '').replace(/\\/g, '/');

      // 访问权限检查
      if (!canAccess('posts', slug, isAuthenticated, dbAvailable, config)) {
        continue;
      }

      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);

      const title = String(data.title ?? '');
      const description = String(data.description ?? '');
      const tags: string[] = Array.isArray(data.tags) ? data.tags : [];

      const qLower = query.toLowerCase();
      const tLower = title.toLowerCase();
      const dLower = description.toLowerCase();
      const cLower = content.toLowerCase();

      const matchesTitle = tLower.includes(qLower);
      const matchesDesc = dLower.includes(qLower);
      const matchesTags = tags.some((t) => t.toLowerCase().includes(qLower));
      const matchesContent = cLower.includes(qLower);

      if (!matchesTitle && !matchesDesc && !matchesTags && !matchesContent) {
        continue;
      }

      // 标签筛选（点击热门标签时传入）
      if (tagFilter && !tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) {
        continue;
      }

      const matchPreview = extractMatchPreview(content, query);

      results.push({
        id: slug,
        title,
        description,
        tags,
        slug,
        matchPreview,
        type: 'post',
      });
    }
  }

  return results;
}

/**
 * 搜索日记（仅管理员）
 * diary 存储在数据库中，仅能搜索标题和标签（内容已加密）
 */
async function searchDiaryEntries(query: string): Promise<SearchResult[]> {
  if (!hasDatabase()) return [];

  try {
    const { prisma } = await import('@/lib/db');
    const diaries = await prisma.diary.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { tags: { has: query } },
        ],
      },
      select: {
        id: true,
        title: true,
        tags: true,
        date: true,
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    return diaries.map((d) => ({
      id: String(d.id),
      title: d.title,
      description: '',
      tags: d.tags ?? [],
      slug: `/diary/${d.id}`,
      matchPreview: d.date
        ? `日期: ${new Date(d.date).toLocaleDateString('zh-CN')}`
        : '',
      type: 'diary' as const,
    }));
  } catch (e) {
    logger.warn('searchDiary', '搜索日记失败', {
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

// ─── API Route ──────────────────────────────────────────────────────────────

export const GET = apiHandler('GET', { label: '搜索' }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const tag = searchParams.get('tag')?.trim();

  if (!query && !tag) {
    return NextResponse.json({ results: [], groups: [] });
  }

  // 搜索词为空时使用标签作为搜索词
  const searchQuery = query || tag || '';

  logger.info('GET', '执行搜索', { query: searchQuery, tag });

  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  // 搜索 posts
  const postResults = searchPostsDirectory(
    POSTS_DIR,
    POSTS_DIR,
    searchQuery,
    isAuthenticated,
    dbAvailable,
    tag,
  );

  // 按相关性排序
  postResults.sort((a, b) => {
    const scoreA = calcRelevance(a.title, a.description, a.tags, '', searchQuery);
    const scoreB = calcRelevance(b.title, b.description, b.tags, '', searchQuery);
    return scoreB - scoreA;
  });

  const topPosts = postResults.slice(0, 5);

  // 搜索日记（仅管理员）
  let topDiary: SearchResult[] = [];
  if (isAdmin && query) {
    const diaryResults = await searchDiaryEntries(query);
    diaryResults.sort((a, b) => {
      const scoreA = calcRelevance(a.title, a.description, a.tags, '', searchQuery);
      const scoreB = calcRelevance(b.title, b.description, b.tags, '', searchQuery);
      return scoreB - scoreA;
    });
    topDiary = diaryResults.slice(0, 5);
  }

  // 构建分组
  const groups: SearchGroup[] = [];
  if (topPosts.length > 0) {
    groups.push({ type: 'post', label: '文章', results: topPosts });
  }
  if (topDiary.length > 0) {
    groups.push({ type: 'diary', label: '日记', results: topDiary });
  }

  logger.info('GET', '搜索完成', {
    query: searchQuery,
    postCount: topPosts.length,
    diaryCount: topDiary.length,
  });

  return NextResponse.json({
    results: [...topPosts, ...topDiary],
    groups,
  });
});
