/**
 * 自定义 HTML 页面 — WebDAV 读取层
 *
 * 用途:
 * - 供 `scripts/sync-pages.mjs`(Node 脚本)使用,从 WebDAV 拉取 `pages/` 内容
 * - **不**写 `'server-only'`:此模块需要被 Node 脚本 import,而 `server-only`
 *   会在 Node 环境里抛错(只允许在 Next.js 路由渲染时使用)
 *
 * 设计要点:
 * - 与运行时 fs 读取层 `app/page/_lib/fs-page.ts` 接口对齐:
 *   - `fetchPageHtml(relativePath)` ↔ `readPageHtml(relativePath)`
 *   - `scanPagesHtmlDeep()` ↔ `scanLocalPagesHtml()`
 * - 复用 `lib/webdav.ts` 的客户端缓存与 `isWebDavConfigured` 判定
 * - 文件名过滤用 `isHtmlPath`(来自 `./shared`);归一化用 `normalizeWebDavContent`
 */
import type { FileStat } from 'webdav';
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav';
import { isHtmlPath, normalizeWebDavContent } from './shared';

/** WebDAV 列表调用统一使用的 options:`deep: false` 确保跨服务器兼容 */
const LIST_OPTIONS = { deep: false } as const;

/**
 * 拉取 WebDAV 上 HTML 文件内容,统一转 UTF-8 字符串
 *
 * - 找不到文件 / 任意错误 → 返回 `null`
 * - 未配置 WebDAV → 返回 `null`
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的相对路径(含 `pages/` 前缀)
 */
export async function fetchPageHtml(relativePath: string): Promise<string | null> {
  if (!isWebDavConfigured()) return null;
  try {
    const client = getWebDavClient();
    const raw = await client.getFileContents(relativePath);
    if (raw === null || raw === undefined) return null;
    const text = normalizeWebDavContent(raw);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * 单层 `getDirectoryContents` 包装:捕获异常并返回 `[]`
 */
async function safeList(client: ReturnType<typeof getWebDavClient>, dir: string): Promise<FileStat[]> {
  try {
    return await client.getDirectoryContents(dir, LIST_OPTIONS);
  } catch {
    return [];
  }
}

/**
 * 浅层递归扫描 `pages/` 根,收集根级与 1 级子目录下的所有 .html/.htm
 *
 * - 与运行时 `app/page/page.tsx` 的扫描深度保持一致(根 + 1 级子目录)
 * - **不**调用 `deep: true`:不同 WebDAV 服务器对深度递归的支持差异较大,
 *   显式 2 层列表在所有主流实现(Nextcloud /坚果云 / 群晖 / 自建 nginx-dav)
 *   上行为一致且开销可控
 */
export async function scanPagesHtmlDeep(): Promise<{ relativePath: string }[]> {
  if (!isWebDavConfigured()) return [];
  const client = getWebDavClient();
  const out: { relativePath: string }[] = [];

  const rootEntries = await safeList(client, 'pages');
  for (const entry of rootEntries) {
    if (entry.type === 'file' && isHtmlPath(entry.filename)) {
      out.push({ relativePath: `pages/${entry.filename}` });
      continue;
    }
    if (entry.type === 'directory') {
      const subEntries = await safeList(client, `pages/${entry.filename}`);
      for (const sub of subEntries) {
        if (sub.type === 'file' && isHtmlPath(sub.filename)) {
          out.push({ relativePath: `pages/${entry.filename}/${sub.filename}` });
        }
      }
    }
  }
  return out;
}
