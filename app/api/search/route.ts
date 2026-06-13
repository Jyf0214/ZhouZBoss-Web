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

// ─── 构建时搜索索引 ────────────────────────────────────────────────────────

/** 索引条目类型（与 generate-search-index.mjs 输出结构一致） */
interface SearchIndexEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
}

/** 模块级单例缓存，避免每次请求重复读取磁盘 */
let _searchIndex: SearchIndexEntry[] | null = null;
/** 标记是否已尝试加载过索引（区分"索引为空"和"尚未加载"） */
let _searchIndexLoaded = false;

/**
 * 加载构建时预生成的搜索索引
 * 首次调用时从磁盘读取并缓存，后续调用直接返回缓存
 * 索引文件不存在或读取失败时返回 null，由调用方降级到实时扫描
 */
function loadSearchIndex(): SearchIndexEntry[] | null {
  if (_searchIndexLoaded) return _searchIndex;
  _searchIndexLoaded = true;

  try {
    const indexPath = path.join(process.cwd(), 'data', 'search-index.json');
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _searchIndex = parsed;
        return _searchIndex;
      }
    }
  } catch {
    // 索引文件损坏或读取失败，降级到实时扫描
  }
  return null;
}

/** 处理单个 markdown 文件，返回搜索结果或 undefined */
function processSearchFile(
  filePath: string,
  baseDir: string,
  query: string,
  options: {
    isAuthenticated: boolean;
    dbAvailable: boolean;
    tagFilter?: string;
  },
): SearchResult | undefined {
  const relative = path.relative(baseDir, filePath);
  const slug = '/' + relative.replace(/\.md$/, '').replace(/\\/g, '/');
  const config = loadConfig();

  if (!canAccess('posts', slug, options.isAuthenticated, options.dbAvailable, config)) {
    return undefined;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
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

  const { tagFilter } = options;

  if (!matchesTitle && !matchesDesc && !matchesTags && !matchesContent) {
    return undefined;
  }

  if (tagFilter && !tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) {
    return undefined;
  }

  const matchPreview = extractMatchPreview(content, query);

  return {
    id: slug,
    title,
    description,
    tags,
    slug,
    matchPreview,
    type: 'post',
  };
}

// ─── Search Functions ──────────────────────────────────────────────────────

/**
 * 降级方案：递归扫描 posts 目录，搜索匹配的文章
 * 仅在构建时索引文件缺失时使用（运行时每次请求都会读取文件系统）
 */
function searchPostsDirectoryLegacy(
  dir: string,
  baseDir: string,
  query: string,
  options: {
    isAuthenticated: boolean;
    dbAvailable: boolean;
    tagFilter?: string;
  },
): SearchResult[] {
  const results: SearchResult[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(
        ...searchPostsDirectoryLegacy(fullPath, baseDir, query, options),
      );
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const result = processSearchFile(
        fullPath,
        baseDir,
        query,
        options,
      );
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * 使用构建时预生成的索引搜索文章（内存中匹配，无需读取文件系统）
 */
function searchFromIndex(
  index: SearchIndexEntry[],
  query: string,
  options: {
    isAuthenticated: boolean;
    dbAvailable: boolean;
    tagFilter?: string;
  },
): SearchResult[] {
  const results: SearchResult[] = [];
  const qLower = query.toLowerCase();
  const config = loadConfig();

  for (const entry of index) {
    // 权限检查：索引包含所有文章，运行时按当前认证状态过滤
    if (!canAccess('posts', entry.slug, options.isAuthenticated, options.dbAvailable, config)) {
      continue;
    }

    const tLower = entry.title.toLowerCase();
    const dLower = entry.description.toLowerCase();
    const cLower = entry.content.toLowerCase();

    const matchesTitle = tLower.includes(qLower);
    const matchesDesc = dLower.includes(qLower);
    const matchesTags = entry.tags.some((t) => t.toLowerCase().includes(qLower));
    const matchesContent = cLower.includes(qLower);

    if (!matchesTitle && !matchesDesc && !matchesTags && !matchesContent) {
      continue;
    }

    if (options.tagFilter && !entry.tags.some((t) => t.toLowerCase() === options.tagFilter!.toLowerCase())) {
      continue;
    }

    // 使用原始内容生成预览（索引已截取前 5000 字，足够生成上下文摘要）
    const matchPreview = extractMatchPreview(entry.content, query);

    results.push({
      id: entry.slug,
      title: entry.title,
      description: entry.description,
      tags: entry.tags,
      slug: entry.slug,
      matchPreview,
      type: 'post',
    });
  }

  return results;
}

/**
 * 搜索入口：优先使用构建时索引，索引不可用时降级到实时扫描
 */
function searchPostsDirectory(
  dir: string,
  baseDir: string,
  query: string,
  options: {
    isAuthenticated: boolean;
    dbAvailable: boolean;
    tagFilter?: string;
  },
): SearchResult[] {
  const index = loadSearchIndex();
  if (index) {
    return searchFromIndex(index, query, options);
  }
  // 降级：原有的实时扫描逻辑
  return searchPostsDirectoryLegacy(dir, baseDir, query, options);
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
  const searchQuery = query || (tag ?? '');

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
    { isAuthenticated, dbAvailable, tagFilter: tag },
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
