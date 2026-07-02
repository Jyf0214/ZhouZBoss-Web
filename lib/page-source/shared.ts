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
export const PAGES_PREFIX = 'page';

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
 * - 不再强制要求 `.html` 扩展名——目录路径由 `resolvePageFilePath` 解析
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
  return joined;
}

/**
 * 将相对路径解析为实际 HTML 文件路径
 *
 * - 已含 `.html/.htm` 扩展名 → 原样返回
 * - 目录路径(如 `pages/hello`) → 拼接 `index.html` 返回
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的路径
 */
export function resolvePageFilePath(relativePath: string): string {
  if (isHtmlPath(relativePath)) {
    return relativePath;
  }
  return `${relativePath}/index.html`;
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

/* ── 页面元数据 ── */

/** 页面元数据结构，存储在 pages/{name}/meta.json */
export interface PageMeta {
  title?: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const META_FILENAME = 'meta.json';

/**
 * 根据 HTML 文件的相对路径推导 meta.json 的存储路径
 *
 * 约定：meta.json 放在与 HTML 同级的同名目录下
 * - pages/mypage.html → pages/mypage/meta.json
 * - pages/subdir/mypage.html → pages/subdir/mypage/meta.json
 */
export function buildMetaPath(relativePath: string): string | null {
  const parts = relativePath.split('/');
  if (parts.length < 2) return null;
  const filename = parts[parts.length - 1];
  if (!filename) return null;
  const dir = parts.slice(0, -1).join('/');
  const name = filename.replace(/\.html?$/i, '');
  if (!name) return null;
  return `${dir}/${name}/${META_FILENAME}`;
}

/**
 * 校验并归一化 meta.json 原始数据，仅保留白名单字段
 */
export function validatePageMeta(raw: unknown): PageMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result: PageMeta = {};
  if (typeof obj.title === 'string') result.title = obj.title;
  if (typeof obj.description === 'string') result.description = obj.description;
  if (typeof obj.coverImage === 'string') result.coverImage = obj.coverImage;
  if (Array.isArray(obj.tags) && obj.tags.every((t): t is string => typeof t === 'string')) {
    result.tags = obj.tags;
  }
  if (typeof obj.createdAt === 'string') result.createdAt = obj.createdAt;
  if (typeof obj.updatedAt === 'string') result.updatedAt = obj.updatedAt;
  return result;
}
