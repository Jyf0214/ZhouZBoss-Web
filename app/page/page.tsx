import 'server-only';
import { PAGES_PREFIX } from '@/lib/page-source/shared';
import {
  scanLocalPagesHtml,
  fetchPageHtml,
  fetchPageMeta,
  deepScanLocalFiles,
} from '@/lib/page-source/fs';
import { PageIndexView, type PageIndexItem, type StorageOrphan } from './_components/PageIndexView';

export const dynamic = 'force-dynamic';

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
  // relativePath 已经是 'page/xxx.html'
  const relPath = relativePath.slice(PAGES_PREFIX.length + 1);
  const relParts = relPath.split('/');
  const relFilename = relParts[relParts.length - 1];
  if (relFilename === 'index.html' || relFilename === 'index.htm') {
    return relParts.length > 1
      ? `/page/${relParts.slice(0, -1).join('/')}`
      : `/page`;
  }
  return `/page/${relPath.replace(/\.(html?|htm)$/i, '')}`;
}

/**
 * 检测本地 public/page 中存在但未在索引中显示的条目
 */
function detectOrphans(
  scanned: { relativePath: string }[]
): StorageOrphan[] {
  const allFiles = deepScanLocalFiles(PAGES_PREFIX, 0);

  const indexed = new Map<string, boolean>();
  for (const s of scanned) {
    indexed.set(s.relativePath, true);
  }

  const orphans: StorageOrphan[] = [];
  for (const f of allFiles) {
    if (indexed.has(f.relativePath)) continue;
    const filename = f.relativePath.split('/').pop() ?? '';
    if (filename === '.keep' || filename.startsWith('.')) continue;

    const reason: StorageOrphan['reason'] = f.relativePath.endsWith('.html') ||
      f.relativePath.endsWith('.htm')
      ? 'depth'
      : 'notHtml';
    orphans.push({ relativePath: f.relativePath, reason });
  }
  return orphans;
}

export default async function PageIndex() {
  // 直接从本地 fs 扫描
  let scanned: { relativePath: string }[] = [];
  try {
    scanned = scanLocalPagesHtml();
  } catch (err) {
    console.error('[custom-page-index] scan local pages failed:', err);
    scanned = [];
  }

  if (scanned.length === 0) {
    return (
      <PageIndexView
        notConfigured={false}
        pages={[]}
        emptyDirs={[]}
      />
    );
  }

  // 检测未索引文件
  let orphans: StorageOrphan[] = [];
  try {
    orphans = await detectOrphans(scanned);
  } catch (err) {
    console.error('[custom-page-index] detect orphans failed:', err);
  }

  const items: PageIndexItem[] = await Promise.all(
    scanned.map(async ({ relativePath }): Promise<PageIndexItem> => {
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1] ?? 'index.html';
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : PAGES_PREFIX;

      const hiddenInDir = orphans.filter(o =>
        o.relativePath.startsWith(dir + '/') ||
        (dir === PAGES_PREFIX && o.relativePath.startsWith(PAGES_PREFIX + '/') && !o.relativePath.slice(PAGES_PREFIX.length + 1).includes('/'))
      ).length;

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
        isPrivate: false, // 移除访问控制，全部设为公开
        hiddenCount: hiddenInDir,
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
      emptyDirs={[]}
      orphans={orphans}
    />
  );
}
