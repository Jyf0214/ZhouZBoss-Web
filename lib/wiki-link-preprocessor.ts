/**
 * Wiki-link 文本预处理器
 *
 * 在 Markdown 内容送入 react-markdown 之前，
 * 将 [[标题]] 语法转换为标准 Markdown 链接 [标题](/url)。
 *
 * 零外部依赖，纯正则文本替换，复用 lib/content-registry.ts 的标题解析。
 */

import { resolveWikiLink } from './content-registry';

/** [[标题]] 匹配正则 */
const WIKI_LINK_RE = /\[\[([^\[\]]+?)\]\]/g;

/**
 * 预处理 Markdown 内容，将 [[标题]] 转为 Markdown 链接
 *
 * 处理规则：
 * - 标题在注册表中找到 → 转为 [标题](url) 标准链接
 * - 标题未找到 → 保留原始 [[标题]] 文本（不转换，让后续渲染器原样展示）
 *
 * @param content 原始 Markdown 内容
 * @returns 转换后的内容
 */
export function preprocessWikiLinks(content: string): string {
  return content.replace(WIKI_LINK_RE, (_match, rawTitle: string) => {
    const title = rawTitle.trim();
    const resolved = resolveWikiLink(title);
    if (resolved) {
      return `[${resolved.title}](${resolved.url})`;
    }
    // 未解析的引用保留原文
    return `[[${title}]]`;
  });
}
