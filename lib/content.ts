import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type ContentFile, type ContentIndex } from '@/types/content';

export type { ContentMeta, ContentFile, ContentIndex } from '@/types/content';

const CONTENT_DIR = {
  posts: path.join(/*turbopackIgnore: true*/ process.cwd(), 'posts'),
  faces: path.join(/*turbopackIgnore: true*/ process.cwd(), 'faces'),
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
      title: data.title || path.basename(filePath, '.md'),
      date: data.date ? String(data.date) : undefined,
      author: data.author,
      tags: data.tags,
      cover: data.cover,
      description: data.description,
      ...data,
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
        title: data.title || path.basename(dir),
        description: data.description || content.slice(0, 200),
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
          title: titleMatch?.[1] || path.basename(dir),
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
 * 获取指定分区的所有内容文件
 * @param section 内容分区：posts 或 faces
 * @param includeIndex 是否包含目录索引信息
 */
export function getContentFiles(section: 'posts' | 'faces'): ContentFile[] {
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

  return files;
}

/**
 * 获取指定分区下的目录索引列表
 * 用于展示分组/分类视图
 */
export function getContentIndexes(section: 'posts' | 'faces'): ContentIndex[] {
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
  return indexes;
}

/**
 * 获取单个内容文件
 * @param section 内容分区
 * @param slug 内容路径（如 /daily/2024-01）
 */
export function getContentFile(section: 'posts' | 'faces', slug: string): ContentFile | null {
  const rootDir = CONTENT_DIR[section];
  const filePath = path.join(rootDir, slug.slice(1) + '.md');

  if (!fs.existsSync(filePath)) return null;
  return parseMarkdownFile(filePath, slug);
}

/**
 * 获取指定分区下所有可用的 slug 列表
 * 用于 generateStaticParams 生成静态页面
 */
export function getAllSlugs(section: 'posts' | 'faces'): string[] {
  const rootDir = CONTENT_DIR[section];
  if (!fs.existsSync(rootDir)) return [];
  return scanMarkdownFiles(rootDir, rootDir);
}

/**
 * 获取目录树结构（用于导航和面包屑）
 */
export function getContentTree(section: 'posts' | 'faces'): ContentIndex[] {
  const rootDir = CONTENT_DIR[section];
  if (!fs.existsSync(rootDir)) return [];

  const indexes = getContentIndexes(section);
  const files = getContentFiles(section);

  // 将文件分配到对应的目录索引
  for (const file of files) {
    const dirSlug = path.dirname(file.slug);
    const parentIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    if (parentIndex) {
      parentIndex.children.push(file);
    } else {
      // 没有索引的目录，创建默认索引
      const defaultIndex: ContentIndex = {
        slug: dirSlug,
        title: dirSlug === '/' ? '根目录' : path.basename(dirSlug),
        public: true,
        children: [file],
      };
      indexes.push(defaultIndex);
    }
  }

  return indexes;
}
