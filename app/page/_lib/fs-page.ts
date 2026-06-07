/**
 * 「自定义 HTML 页面」运行时 — 本地 fs 读取层
 *
 * 用途:
 * - 替代原先的运行时 WebDAV 读取(`app/page/_lib/webdav-page.ts`)
 * - 数据源改为项目根 `./pages/` 目录,该目录由 `scripts/sync-pages.mjs`
 *   在 build 阶段从 WebDAV 完整镜像下来
 * - 私有页面密码 ACL 仍走 `lib/storage/acl.ts` 的 `checkPageAccess`(Prisma)
 *
 * 设计要点:
 * - 用 `'server-only'` 标记,严禁被打包到客户端
 * - 路径基准:`path.join(process.cwd(), 'pages', relativePath)`
 *   - `process.cwd()` 在 `next build` / `next start` 下指向项目根
 *   - `./pages/` 已在 `.gitignore` 忽略,不会被提交
 * - 与 `lib/page-source/webdav.ts` 接口语义对齐,便于上层无感切换
 */
import 'server-only';
import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { PAGES_PREFIX, isHtmlPath, extractTitle } from '@/lib/page-source/shared';

/** 本地镜像目录绝对路径(项目根的 `./pages/`) */
const LOCAL_PAGES_DIR = path.join(process.cwd(), PAGES_PREFIX);

/** 同步脚本对 `pages/` 做的最大深度(根 + 1 级子目录 = 2) */
const MAX_SCAN_DEPTH = 2;

export interface ScannedLocalPage {
  relativePath: string;
  dir: string;
  filename: string;
  size: number;
  lastModified: string;
}

/**
 * 读取本地镜像的 HTML 文件内容
 *
 * - 文件不存在(`ENOENT`)→ 返回 `null`
 * - 其它读取错误 → 抛给上层(不应静默)
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的相对路径(含 `pages/` 前缀)
 */
export async function readPageHtml(relativePath: string): Promise<string | null> {
  const absolutePath = path.join(LOCAL_PAGES_DIR, relativePath);
  try {
    const content = await fs.readFile(absolutePath, 'utf8');
    return content;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * 检查某个相对路径对应的本地 HTML 文件是否存在
 *
 * - 主要供 `app/page/[...path]/page.tsx` 的存在性快速判定
 * - 与 `readPageHtml` 不同:这里用 `stat`,不会把文件读入内存
 */
export async function isLocalPageAvailable(relativePath: string): Promise<boolean> {
  const absolutePath = path.join(LOCAL_PAGES_DIR, relativePath);
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * 判断 `./pages/` 目录是否为空(不存在 / 无任何条目)
 *
 * - 用于索引页(`app/page/page.tsx`)决定展示哪种空状态卡片
 * - 注意:WebDAV 未配置时 `sync-pages.mjs` 会清空 `./pages/`,
 *   运行时无需再区分"未配置"和"空"两种状态,统一走同一张空状态卡
 */
export async function isLocalPagesEmpty(): Promise<boolean> {
  try {
    const entries = await fs.readdir(LOCAL_PAGES_DIR);
    return entries.length === 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return true;
    throw err;
  }
}

/**
 * 单层 `readdir`:目录不存在返回 `[]`,其它错误抛给上层
 */
async function safeReaddir(dir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * 浅层递归扫描本地 `./pages/` 目录,收集根级与 1 级子目录下的所有 .html/.htm
 *
 * - 与 `lib/page-source/webdav.ts` 的 `scanPagesHtmlDeep` 保持同构
 * - 索引页用此函数生成卡片列表
 */
export async function scanLocalPagesHtml(): Promise<ScannedLocalPage[]> {
  const out: ScannedLocalPage[] = [];

  const rootEntries = await safeReaddir(LOCAL_PAGES_DIR);
  for (const entry of rootEntries) {
    if (entry.isFile() && isHtmlPath(entry.name)) {
      const filename = entry.name;
      const relativePath = `${PAGES_PREFIX}/${filename}`;
      const stat = await fs.stat(path.join(LOCAL_PAGES_DIR, filename));
      out.push({
        relativePath,
        dir: PAGES_PREFIX,
        filename,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
      });
      continue;
    }
    if (entry.isDirectory() && MAX_SCAN_DEPTH >= 2) {
      const subAbs = path.join(LOCAL_PAGES_DIR, entry.name);
      const subEntries = await safeReaddir(subAbs);
      for (const sub of subEntries) {
        if (sub.isFile() && isHtmlPath(sub.name)) {
          const filename = sub.name;
          const relativePath = `${PAGES_PREFIX}/${entry.name}/${filename}`;
          const stat = await fs.stat(path.join(subAbs, filename));
          out.push({
            relativePath,
            dir: `${PAGES_PREFIX}/${entry.name}`,
            filename,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          });
        }
      }
    }
  }

  return out;
}

/**
 * 在 server component 中提取页面标题(读取 → 解析 title 标签)
 *
 * - 文件不存在 / 读取失败 → 返回 `null`,由调用方降级为文件名
 * - 单独抽出来以复用读取 + 解析的样板
 */
export async function readPageTitle(relativePath: string): Promise<string | null> {
  const html = await readPageHtml(relativePath);
  if (!html) return null;
  return extractTitle(html);
}
