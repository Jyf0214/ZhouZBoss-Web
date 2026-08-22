import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type ContentFile, type ContentIndex } from '@/types/content';

export type { ContentMeta, ContentFile, ContentIndex } from '@/types/content';

// 内存缓存：避免重复的文件系统扫描和 Markdown 解析
// 开发模式下禁用缓存（热重载时文件内容可能变化）
const contentCache = new Map<string, { data: ContentFile[]; timestamp: number }>();
const indexCache = new Map<string, { data: ContentIndex[]; timestamp: number }>();
const CACHE_TTL = process.env.NODE_ENV === 'development' ? 0 : 5 * 60 * 1000; // 生产 5 分钟

const CONTENT_DIR = {
  posts: path.join(/*turbopackIgnore: true*/ process.cwd(), 'posts'),
  faces: path.join(/*turbopackIgnore: true*/ process.cwd(), 'faces'),
  diary: path.join(/*turbopackIgnore: true*/ process.cwd(), 'diary'),
};

/**
 * 递归扫描目录，获取所有 .md 文件
 * 返回相对于根目录的 slug 路径
 */
function scanMarkdownFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relative = path.relative(baseDir, fullPath);
      // 转换为 URL slug：去除 .md 后缀，使用正斜杠
      const slug = '/' + relative.replace(/\.md$/, '').replace(/\\/g, '/');
      results.push(slug);
    }
  }
  return results;
}

/**
 * 解析单个 Markdown 文件
 */
function parseMarkdownFile(filePath: string, slug: string): ContentFile {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    slug,
    meta: {
      title: data.title ?? path.basename(filePath, '.md'),
      date: data.date ? String(data.date) : undefined,
      author: data.author,
      tags: data.tags,
      cover: data.cover,
      description: data.description,
      ...data,
      // 多语言字段：lang（默认 'zh-CN'）和 translations（语言→路径映射）
      // 放在 ...data 之后，确保类型安全和默认值正确
      lang: typeof data.lang === 'string' ? data.lang : 'zh-CN',
      translations: data.translations && typeof data.translations === 'object'
        ? data.translations as Record<string, string>
        : undefined,
    },
    content,
    raw,
  };
}

/**
 * 读取目录的 index 文件（index.md 或 index.tsx/ts）
 * 用于定义目录级别的元信息：公开/私有、分组名称等
 */
function readIndexFile(dir: string): ContentIndex | null {
  const indexPaths = [
    path.join(dir, 'index.md'),
    path.join(dir, 'index.tsx'),
    path.join(dir, 'index.ts'),
  ];

  for (const indexPath of indexPaths) {
    if (!fs.existsSync(indexPath)) continue;

    const ext = path.extname(indexPath);
    const relative = path.relative(CONTENT_DIR.posts, dir);
    const slug = relative ? '/' + relative.replace(/\\/g, '/') : '/';

    if (ext === '.md') {
      const raw = fs.readFileSync(indexPath, 'utf-8');
      const { data, content } = matter(raw);
      return {
        slug,
        title: data.title ?? path.basename(dir),
        description: data.description ?? content.slice(0, 200),
        public: data.public !== false,
        groupName: data.groupName,
        children: [],
      };
    }

    // .tsx/.ts 文件在构建时通过动态 import 获取配置
    // 此处仅读取文件文本，提取导出的配置信息
    if (ext === '.tsx' || ext === '.ts') {
      try {
        const raw = fs.readFileSync(indexPath, 'utf-8');
        // 尝试从文件内容中提取简单配置
        const titleMatch = raw.match(/title['"]*\s*:\s*['"](.+?)['"]/);
        const publicMatch = raw.match(/public['"]*\s*:\s*(true|false)/);
        const groupMatch = raw.match(/groupName['"]*\s*:\s*['"](.+?)['"]/);
        const descMatch = raw.match(/description['"]*\s*:\s*['"](.+?)['"]/);

        return {
          slug,
          title: titleMatch?.[1] ?? path.basename(dir),
          description: descMatch?.[1],
          public: publicMatch ? publicMatch[1] === 'true' : true,
          groupName: groupMatch?.[1],
          children: [],
        };
      } catch {
        return {
          slug,
          title: path.basename(dir),
          public: true,
          children: [],
        };
      }
    }
  }

  return null;
}

/**
 * 限制并发的 Promise 池
 * 同时最多运行 maxConcurrency 个 promise
 */
async function withConcurrency<T, R>(
  items: T[],
  fn: (item: T) => R | Promise<R>,
  maxConcurrency: number,
): Promise<(R | null)[]> {
  const results: (R | null)[] = []
  let index = 0

  const workers = Array.from({ length: Math.min(maxConcurrency, items.length) }, async () => {
    while (true) {
      const i = index++
      if (i >= items.length) break
      try {
        const item = items[i]
        if (item !== undefined) results[i] = await fn(item)
        else results[i] = null
      } catch {
        results[i] = null
      }
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * 获取指定分区的所有内容文件
 * @param section 内容分区：posts、faces 或 diary
 * @param includeIndex 是否包含目录索引信息
 */
export function getContentFiles(section: 'posts' | 'faces' | 'diary'): ContentFile[] {
  const cacheKey = section;
  const now = Date.now();
  const cached = contentCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const rootDir = CONTENT_DIR[section];
  if (!fs.existsSync(rootDir)) return [];

  const slugs = scanMarkdownFiles(rootDir, rootDir);
  const files: ContentFile[] = [];

  for (const slug of slugs) {
    const filePath = path.join(rootDir, slug.slice(1) + '.md');
    if (fs.existsSync(filePath)) {
      files.push(parseMarkdownFile(filePath, slug));
    }
  }

  // 按日期降序排序
  files.sort((a, b) => {
    const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
    const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
    return dateB - dateA;
  });

  contentCache.set(cacheKey, { data: files, timestamp: Date.now() });
  return files;
}

/**
 * 并行获取指定分区的所有内容文件（异步版本，适合 API 路由等异步场景）
 * 使用 Promise 池限制并发数，避免文件描述符耗尽
 */
export async function getContentFilesAsync(
  section: 'posts' | 'faces' | 'diary',
): Promise<ContentFile[]> {
  const rootDir = CONTENT_DIR[section];
  if (!fs.existsSync(rootDir)) return [];

  const slugs = scanMarkdownFiles(rootDir, rootDir);
  if (slugs.length === 0) return [];

  // 并行读取所有 Markdown 文件（限制并发数避免文件描述符耗尽）
  const MAX_FILE_READ_CONCURRENCY = 50;

  const results = await withConcurrency(
    slugs,
    (slug) => {
      const filePath = path.join(rootDir, slug.slice(1) + '.md');
      if (fs.existsSync(filePath)) {
        return parseMarkdownFile(filePath, slug);
      }
      return null;
    },
    MAX_FILE_READ_CONCURRENCY,
  );

  const files = results.filter((f): f is ContentFile => f !== null && f !== undefined);

  // 按日期降序排序
  files.sort((a, b) => {
    const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
    const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
    return dateB - dateA;
  });

  return files;
}

/**
 * 过滤公开且未隐藏的文章
 * 统一所有页面的 public + hidden 检查逻辑，避免重复实现导致遗漏
 *
 * @param files 原始文件列表
 * @param indexes 目录索引列表（可选，未提供时自动获取 posts 分区索引）
 * @returns 仅包含公开且未隐藏文章的列表
 */
export function filterPublicFiles(
  files: ContentFile[],
  indexes?: ContentIndex[],
): ContentFile[] {
  const idx = indexes ?? getContentIndexes('posts');
  return files.filter((file) => {
    const isHidden = file.meta.hidden === true;
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = idx.find(
      (id) => id.slug === dirSlug || (dirSlug === '/' && id.slug === '/'),
    );
    const isPublic = dirIndex ? dirIndex.public : true;
    return isPublic && !isHidden;
  });
}

/**
 * 获取指定分区下的目录索引列表
 * 用于展示分组/分类视图
 */
export function getContentIndexes(section: 'posts' | 'faces' | 'diary'): ContentIndex[] {
  // 检查索引缓存
  const cacheKey = section;
  const now = Date.now();
  const cached = indexCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const rootDir = CONTENT_DIR[section];
  if (!fs.existsSync(rootDir)) return [];

  const indexes: ContentIndex[] = [];

  // 根目录索引
  const rootIndex = readIndexFile(rootDir);
  if (rootIndex) {
    indexes.push(rootIndex);
  }

  // 子目录索引
  function scanSubDirs(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(dir, entry.name);
        const index = readIndexFile(subDir);
        if (index) {
          indexes.push(index);
        }
        scanSubDirs(subDir);
      }
    }
  }

  scanSubDirs(rootDir);

  // 写入索引缓存
  indexCache.set(cacheKey, { data: indexes, timestamp: Date.now() });
  return indexes;
}

/**
 * 获取单个内容文件
 * @param section 内容分区
 * @param slug 内容路径（如 /daily/2024-01）
 */
export function getContentFile(section: 'posts' | 'faces' | 'diary', slug: string): ContentFile | null {
  const rootDir = CONTENT_DIR[section];
  const filePath = path.join(rootDir, slug.slice(1) + '.md');
  // 路径穿越防护：确保解析后的路径在允许的目录内
  const resolved = path.resolve(filePath);
  const allowedDir = path.resolve(rootDir);
  if (!resolved.startsWith(allowedDir + path.sep) && resolved !== allowedDir) {
    return null;
  }

  if (!fs.existsSync(filePath)) return null;
  return parseMarkdownFile(filePath, slug);
}

/**
 * 获取指定分区下所有可用的 slug 列表
 * 用于 generateStaticParams 生成静态页面
 */
export function getAllSlugs(section: 'posts' | 'faces' | 'diary'): string[] {
  const rootDir = CONTENT_DIR[section];
  if (!fs.existsSync(rootDir)) return [];
  return scanMarkdownFiles(rootDir, rootDir);
}

/**
 * 获取指定文章的前一篇和后一篇（按日期降序排列）
 * 仅考虑公开文章，用于文章详情页的上下篇导航
 */
export function getAdjacentPosts(currentSlug: string): {
  prev: { slug: string; title: string; cover?: string } | null;
  next: { slug: string; title: string; cover?: string } | null;
} {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 过滤公开且未隐藏的文章（与首页、帖子列表页保持一致）
  const publicFiles = filterPublicFiles(allFiles, indexes);

  const currentIndex = publicFiles.findIndex((f) => f.slug === currentSlug);
  if (currentIndex === -1) return { prev: null, next: null };

  // 数组按日期降序排列，索引越大日期越早
  const prevFile = currentIndex < publicFiles.length - 1 ? publicFiles[currentIndex + 1] : null;
  const nextFile = currentIndex > 0 ? publicFiles[currentIndex - 1] : null;

  return {
    prev: prevFile ? { slug: prevFile.slug, title: prevFile.meta.title, cover: prevFile.meta.cover } : null,
    next: nextFile ? { slug: nextFile.slug, title: nextFile.meta.title, cover: nextFile.meta.cover } : null,
  };
}
