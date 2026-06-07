/**
 * 自定义 HTML 页面 — 共享纯函数
 *
 * 用途:
 * - 提供与「数据来源(WebDAV / 本地 fs)」无关的纯函数
 * - 同步脚本与运行时 server component 均可复用
 *
 * 设计要点:
 * - 零依赖,可在 Node 脚本与 Next.js 通用环境运行(不写 `'server-only'`)
 * - 函数均为纯函数,无 IO、无副作用
 *
 * 跨语言复用:
 * - `normalizeWebDavContent` 的实现在 `./normalize-webdav.mjs` 纯 JS 文件,
 *   Node 同步脚本 (`scripts/sync-pages.mjs`) 也直接 import,避免重复实现
 * - 本文件用 re-export 保持 TypeScript 端的导入路径不变
 */
import { isValidPath, joinPath } from '@/lib/storage/path'
import { normalizeWebDavContent as normalizeWebDavContentImpl } from './normalize-webdav.mjs'

/** WebDAV 与本地 fs 上 `pages/` 目录的统一前缀 */
export const PAGES_PREFIX = 'pages';

/**
 * 仅接受 `.html` / `.htm` 扩展名(大小写不敏感)
 */
export function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path);
}

/**
 * 提取 `<title>` 标签内容
 *
 * - 不区分大小写
 * - 去除首尾空白
 * - 未找到或内容为空均返回 `null`
 */
export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const trimmed = match?.[1]?.trim();
  if (!trimmed) return null;
  return trimmed;
}

/**
 * 把 [...path] 路由段拼接为 WebDAV / 本地 fs 上的相对路径,并校验合法性
 *
 * - 自动拼接 `pages/` 前缀
 * - 通过 `isValidPath` 拒绝目录穿越、绝对路径、控制字符
 * - 仅接受 `.html` / `.htm` 扩展名(大小写不敏感)
 * - 空数组 / 任一段为空字符串 → `null`
 *
 * @param segments 来自 `params.path` 的路径段数组
 * @returns 合法则返回完整相对路径(含 `pages/` 前缀);非法返回 `null`
 */
export function buildPageRelativePath(segments: readonly string[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }
  if (segments.some((seg) => typeof seg !== 'string' || seg.length === 0)) {
    return null;
  }
  const joined = joinPath(PAGES_PREFIX, ...segments);
  if (!isValidPath(joined)) {
    return null;
  }
  if (!isHtmlPath(joined)) {
    return null;
  }
  return joined;
}

/**
 * WebDAV `getFileContents` 的多种返回类型统一转成 UTF-8 字符串
 *
 * - 同步脚本与运行时共用(实现在 `normalize-webdav.mjs`)
 * - 此处仅做类型标注与 re-export,避免在 TS 侧重复实现导致漂移
 */
export const normalizeWebDavContent: (
  raw: string | Buffer | ArrayBuffer | { data: string | Buffer | ArrayBuffer },
) => string = normalizeWebDavContentImpl;
