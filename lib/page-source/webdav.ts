/**
 * 自定义 HTML 页面 — 存储读取层
 *
 * 用途:
 * - 供 `scripts/sync-pages.mjs`(Node 脚本)使用,从存储后端拉取 `pages/` 内容
 * - **不**写 `'server-only'`:此模块需要被 Node 脚本 import,而 `server-only`
 *   会在 Node 环境里抛错(只允许在 Next.js 路由渲染时使用)
 *
 * 设计要点:
 * - 与运行时 fs 读取层 `app/page/_lib/fs-page.ts` 接口对齐:
 *   - `fetchPageHtml(relativePath)` ↔ `readPageHtml(relativePath)`
 *   - `scanPagesHtmlDeep()` ↔ `scanLocalPagesHtml()`
 * - 通过 StorageProvider 接口支持 WebDAV / Backblaze B2 双后端
 * - 文件名过滤用 `isHtmlPath`(来自 `./shared`);归一化用 `normalizeWebDavContent`
 */
import type { FileStat } from 'webdav'
import { isStorageConfigured, getStorageProviderSync } from '@/lib/storage/storage-provider';
import { isHtmlPath, normalizeWebDavContent, buildMetaPath, validatePageMeta, type PageMeta } from './shared';

/**
 * 拉取存储后端上 HTML 文件内容,统一转 UTF-8 字符串
 *
 * - 找不到文件 / 任意错误 → 返回 `null`
 * - 未配置存储后端 → 返回 `null`
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的相对路径(含 `pages/` 前缀)
 */
export async function fetchPageHtml(relativePath: string): Promise<string | null> {
  if (!isStorageConfigured()) return null;
  try {
    const provider = getStorageProviderSync();
    const raw = await provider.getFileContents(relativePath);
    if (raw === null || raw === undefined) return null;
    const text = normalizeWebDavContent(raw);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * 单层目录列表包装:捕获异常并返回 `[]`
 */
async function safeList(dir: string): Promise<FileStat[]> {
  try {
    const provider = getStorageProviderSync();
    return await provider.listDirectory(dir);
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
 * - B2 后端通过前缀 + delimiter 实现相同的浅层列表语义
 */
export async function scanPagesHtmlDeep(): Promise<{ relativePath: string }[]> {
  if (!isStorageConfigured()) return [];
  const out: { relativePath: string }[] = [];

  const rootEntries = await safeList('pages');
  for (const entry of rootEntries) {
    if (entry.type === 'file' && isHtmlPath(entry.filename)) {
      out.push({ relativePath: `pages/${entry.filename}` });
      continue;
    }
    if (entry.type === 'directory') {
      const subEntries = await safeList(`pages/${entry.filename}`);
      for (const sub of subEntries) {
        if (sub.type === 'file' && isHtmlPath(sub.filename)) {
          out.push({ relativePath: `pages/${entry.filename}/${sub.filename}` });
        }
      }
    }
  }
  return out;
}

/* ── 页面元数据读写 ── */

/** 读取指定页面的 meta.json，不存在返回 null */
export async function fetchPageMeta(relativePath: string): Promise<PageMeta | null> {
  if (!isStorageConfigured()) return null;
  const metaPath = buildMetaPath(relativePath);
  if (!metaPath) return null;
  try {
    const provider = getStorageProviderSync();
    const raw = await provider.getFileContents(metaPath);
    if (raw === null || raw === undefined) return null;
    const text = normalizeWebDavContent(raw);
    if (!text) return null;
    return validatePageMeta(JSON.parse(text) as unknown);
  } catch { return null; }
}

/** 写入/合并 meta.json（保留已有字段，自动设置 updatedAt） */
export async function putPageMeta(relativePath: string, meta: PageMeta): Promise<{ ok: boolean; error?: string }> {
  if (!isStorageConfigured()) return { ok: false, error: '存储后端未配置' };
  const metaPath = buildMetaPath(relativePath);
  if (!metaPath) return { ok: false, error: '无法推导 meta.json 路径' };
  try {
    const provider = getStorageProviderSync();
    let existing: PageMeta = {};
    try {
      const raw = await provider.getFileContents(metaPath);
      if (raw !== null && raw !== undefined) {
        const text = normalizeWebDavContent(raw);
        if (text) { const v = validatePageMeta(JSON.parse(text) as unknown); if (v) existing = v; }
      }
    } catch { /* 文件不存在 */ }
    const merged: PageMeta = { ...existing, ...meta, updatedAt: new Date().toISOString() };
    if (!existing.createdAt) merged.createdAt = merged.updatedAt;
    await provider.putFileContents(metaPath, Buffer.from(JSON.stringify(merged, null, 2), 'utf-8'), { headers: { overwrite: 'true' } });
    return { ok: true };
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) }; }
}

/** 删除指定页面的 meta.json */
export async function deletePageMeta(relativePath: string): Promise<{ ok: boolean; error?: string }> {
  if (!isStorageConfigured()) return { ok: false, error: '存储后端未配置' };
  const metaPath = buildMetaPath(relativePath);
  if (!metaPath) return { ok: false, error: '无法推导 meta.json 路径' };
  try { await getStorageProviderSync().deleteFile(metaPath); return { ok: true }; }
  catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) }; }
}
