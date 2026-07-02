import 'server-only';
import fs from 'fs';
import path from 'path';
import { PAGES_PREFIX } from '@/lib/page-source/shared';
import { fetchPageHtml, fetchPageMeta } from '@/lib/page-source/fs';
import { PageIndexView, type PageIndexItem } from './_components/PageIndexView';

export const dynamic = 'force-dynamic';

/**
 * 从 public/data/pages-index.json 读取索引
 */
function readPagesIndex(): string[] {
  const indexPath = path.join(process.cwd(), 'public', 'data', 'pages-index.json');
  try {
    if (!fs.existsSync(indexPath)) return [];
    const content = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(content);
    return Array.isArray(index) ? index : [];
  } catch (err) {
    console.error('[custom-page-index] 读取索引文件失败:', err);
    return [];
  }
}

/**
 * 解析页面标题：优先 meta.title，再提取 <title> 标签
 */
function resolvePageTitle(
  filename: string,
  meta: { title?: string } | null,
  html: string | null,
): string {
  if (meta?.title) return meta.title;
  if (html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const extracted = match?.[1]?.trim();
    if (extracted) return extracted;
  }
  return filename;
}

/**
 * 生成 clean URL：index.html 用目录名，其他去掉 .html 后缀
 */
function buildPageHref(relativePath: string): string {
  // relativePath 已经是 'page/xxx.html' 或 'page/xxx'
  const relPath = relativePath.slice(PAGES_PREFIX.length + 1);
  const relParts = relPath.split('/');
  const relFilename = relParts[relParts.length - 1];
  if (relFilename === 'index.html' || relFilename === 'index.htm') {
    return relParts.length > 1
      ? `/page/${relParts.slice(0, -1).join('/')}`
      : `/page`;
  }
  // 目录路径直接返回
  if (!relFilename.includes('.')) {
    return `/page/${relPath}`;
  }
  return `/page/${relPath.replace(/\.(html?|htm)$/i, '')}`;
}

/**
 * 从索引中提取文件路径（排除目录路径）
 * 并将 pages/ 前缀转换为 page/（运行时使用）
 */
function extractFilePaths(index: string[]): string[] {
  return index
    .filter(p => p.endsWith('.html') || p.endsWith('.htm'))
    .map(p => p.replace(/^pages\//, 'page/'));
}

/**
 * 从索引中提取目录路径
 * 并将 pages/ 前缀转换为 page/（运行时使用）
 */
function extractDirPaths(index: string[]): string[] {
  return index
    .filter(p => !p.endsWith('.html') && !p.endsWith('.htm'))
    .map(p => p.replace(/^pages\//, 'page/'));
}

export default async function PageIndex() {
  // 从索引文件读取
  const index = readPagesIndex();

  if (index.length === 0) {
    return (
      <PageIndexView
        notConfigured={false}
        pages={[]}
        emptyDirs={[]}
      />
    );
  }

  const filePaths = extractFilePaths(index);
  const dirPaths = extractDirPaths(index);

  const items: PageIndexItem[] = await Promise.all(
    filePaths.map(async (relativePath): Promise<PageIndexItem> => {
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1] ?? 'index.html';
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : PAGES_PREFIX;

      const [meta, html] = await Promise.all([
        fetchPageMeta(relativePath),
        fetchPageHtml(relativePath)
      ]);

      const title = resolvePageTitle(filename, meta, html);
      const href = buildPageHref(relativePath);

      return {
        href,
        filename,
        folder: dir.slice(PAGES_PREFIX.length + 1),
        title,
        isPrivate: false,
        hiddenCount: 0,
        description: meta?.description,
        coverImage: meta?.coverImage,
        tags: meta?.tags,
        createdAt: meta?.createdAt,
        updatedAt: meta?.updatedAt,
      };
    }),
  );

  return (
    <PageIndexView
      notConfigured={false}
      pages={items}
      emptyDirs={dirPaths.map(d => d.slice(PAGES_PREFIX.length + 1))}
    />
  );
}
