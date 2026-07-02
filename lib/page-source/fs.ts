/**
 * 自定义 HTML 页面 — 本地 fs 读取层
 *
 * 用于运行时直接从构建时同步好的 `public/page/` 目录读取页面内容和元数据。
 * 完全替代运行时的远端 WebDAV/B2 网络请求，解决底层 404 及鉴权过期等问题。
 */
import fs from 'fs';
import path from 'path';
import { normalizeWebDavContent, buildMetaPath, validatePageMeta, type PageMeta } from './shared';

/**
 * 从本地文件系统读取 HTML 页面内容
 *
 * @param relativePath 校验后的相对路径(含 `page/` 前缀，如 `page/about.html`)
 */
export function fetchPageHtml(relativePath: string): string | null {
  try {
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const raw = fs.readFileSync(absolutePath, 'utf-8');
    const text = normalizeWebDavContent(raw);
    return text.length > 0 ? text : null;
  } catch (err) {
    console.error(`[page-source-fs] fetchPageHtml 失败: "${relativePath}"`, err);
    return null;
  }
}

/**
 * 从本地文件系统读取页面元数据
 *
 * @param relativePath 校验后的相对路径(含 `page/` 前缀)
 */
export function fetchPageMeta(relativePath: string): PageMeta | null {
  const metaPath = buildMetaPath(relativePath);
  if (!metaPath) return null;
  try {
    const absolutePath = path.join(process.cwd(), 'public', metaPath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    const raw = fs.readFileSync(absolutePath, 'utf-8');
    const data = JSON.parse(raw);
    return validatePageMeta(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * 扫描本地 public/page 目录下的 HTML 页面 (深度限制 2 层: 根 + 1 级子目录)
 */
export function scanLocalPagesHtml(): { relativePath: string }[] {
  const pagesDir = path.join(process.cwd(), 'public', 'page');
  if (!fs.existsSync(pagesDir)) return [];

  const out: { relativePath: string }[] = [];
  
  const readDir = (dir: string, depth: number) => {
    if (depth > 2) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(path.join(process.cwd(), 'public'), fullPath);
      if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        out.push({ relativePath: relPath });
      } else if (entry.isDirectory()) {
        readDir(fullPath, depth + 1);
      }
    }
  };

  readDir(pagesDir, 1);
  return out;
}

/**
 * 递归深度扫描本地文件 (用于发现未索引文件)
 *
 * @param dir 相对 public 的路径前缀 (如 'page')
 */
export function deepScanLocalFiles(dir: string, depth: number): { relativePath: string }[] {
  if (depth > 3) return [];
  const absoluteDir = path.join(process.cwd(), 'public', dir);
  if (!fs.existsSync(absoluteDir)) return [];

  const out: { relativePath: string }[] = [];
  try {
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        out.push({ relativePath: `${dir}/${entry.name}` });
      } else if (entry.isDirectory()) {
        const sub = deepScanLocalFiles(`${dir}/${entry.name}`, depth + 1);
        out.push(...sub);
      }
    }
  } catch {
    // 忽略读取错误
  }
  return out;
}
