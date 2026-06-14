/**
 * /page — 自定义 HTML 页面索引(服务端入口)
 *
 * - 服务端从存储后端(WebDAV/B2)扫描 pages/ 目录
 * - 列出所有 .html/.htm 文件,显示文件名、所在目录、是否私有
 * - 同时做深层扫描,标记文件夹中未被索引显示的「隐藏」文件数量
 *
 * 行为:
 * - 存储后端未配置 / 无文件 → 展示「暂无可用页面」空状态卡
 * - 存储后端有文件 → 正常列出 + 拼接链接 + 显示隐藏文件徽标
 */
import 'server-only';
import { getDb } from '@/lib/db';
import { PAGES_PREFIX } from '@/lib/page-source/shared';
import {
  isStorageConfigured,
  getStorageProviderSync,
} from '@/lib/storage/storage-provider';
import { scanPagesHtmlDeep, fetchPageHtml } from '@/lib/page-source/webdav';
import { PageIndexView, type PageIndexItem, type StorageOrphan } from './_components/PageIndexView';

export const dynamic = 'force-dynamic';

async function loadPrivateDirs(dirs: readonly string[]): Promise<Set<string>> {
  const prisma = getDb().prisma;
  if (!prisma) return new Set();
  const uniqueDirs = Array.from(new Set(dirs.filter(d => d.length > 0)));
  if (uniqueDirs.length === 0) return new Set();
  const privateSet = new Set<string>();
  try {
    const rows = await prisma.storageFolder.findMany({
      where: { path: { in: uniqueDirs } },
      select: { path: true, public: true },
    });
    for (const row of rows) {
      if (!row.public) privateSet.add(row.path);
    }
  } catch (err) {
    console.error('[custom-page-index] load folder meta failed:', err);
  }
  return privateSet;
}

/**
 * 递归扫描存储后端 pages/ 下所有文件(不限扩展名、不限深度)
 * 用于与 scanPagesHtmlDeep 的浅层扫描结果对比,找出「未索引」文件
 */
async function deepScanAllFiles(
  dir: string,
  depth: number
): Promise<{ relativePath: string }[]> {
  if (depth > 8) return []; // 防止无线递归
  const provider = getStorageProviderSync();
  let entries;
  try {
    entries = await provider.listDirectory(dir);
  } catch {
    return [];
  }

  const out: { relativePath: string }[] = [];
  for (const entry of entries) {
    if (entry.type === 'file') {
      out.push({ relativePath: `${dir}/${entry.filename}` });
    } else if (entry.type === 'directory') {
      const sub = await deepScanAllFiles(`${dir}/${entry.filename}`, depth + 1);
      out.push(...sub);
    }
  }
  return out;
}

/**
 * 生成存储池中存在但未在页面索引中显示的条目列表
 */
async function detectOrphans(
  scanned: { relativePath: string }[]
): Promise<StorageOrphan[]> {
  const allFiles = await deepScanAllFiles('pages', 0);

  // 构建已索引路径集合（规范化为完整路径）
  const indexed = new Map<string, boolean>();
  for (const s of scanned) {
    indexed.set(s.relativePath, true);
  }

  const orphans: StorageOrphan[] = [];
  for (const f of allFiles) {
    if (indexed.has(f.relativePath)) continue;
    // 排除 .keep 等占位文件
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
  if (!isStorageConfigured()) {
    return <PageIndexView notConfigured={true} pages={[]} emptyDirs={[]} />;
  }

  let scanned: { relativePath: string }[];
  try {
    scanned = await scanPagesHtmlDeep();
  } catch {
    scanned = [];
  }

  // 检测存储池中未索引的文件
  let orphans: StorageOrphan[] = [];
  try {
    orphans = await detectOrphans(scanned);
  } catch (err) {
    console.error('[custom-page-index] detect orphans failed:', err);
  }

  if (scanned.length === 0) {
    return (
      <PageIndexView
        notConfigured={false}
        pages={[]}
        emptyDirs={[]}
        orphans={orphans}
      />
    );
  }

  const privateDirs = await loadPrivateDirs(
    scanned.map(s => {
      const parts = s.relativePath.split('/');
      return parts.length > 1 ? parts.slice(0, -1).join('/') : PAGES_PREFIX;
    }),
  );

  const items: PageIndexItem[] = await Promise.all(
    scanned.map(async ({ relativePath }): Promise<PageIndexItem> => {
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1] ?? 'index.html';
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : PAGES_PREFIX;

      // 计算此文件夹下的隐藏文件数量
      const hiddenInDir = orphans.filter(o =>
        o.relativePath.startsWith(dir + '/') ||
        (dir === PAGES_PREFIX && o.relativePath.startsWith(PAGES_PREFIX + '/') && !o.relativePath.slice(PAGES_PREFIX.length + 1).includes('/'))
      ).length;

      let title = filename;
      try {
        const html = await fetchPageHtml(relativePath);
        if (html) {
          const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const extracted = match?.[1]?.trim();
          if (extracted) title = extracted;
        }
      } catch {
        /* 保持 filename */
      }

      const href = `/page/${relativePath.slice(PAGES_PREFIX.length + 1)}`;
      return {
        href,
        filename,
        folder: dir.slice(PAGES_PREFIX.length + 1),
        title,
        isPrivate: privateDirs.has(dir),
        hiddenCount: hiddenInDir,
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
