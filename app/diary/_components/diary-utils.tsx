import type { DiaryReference } from './types';
import type { WikiLinkMap } from '@/components/MarkdownRenderer/types';

/** [[标题]] 提取正则 */
const WIKI_LINK_RE = /\[\[([^\[\]]+?)\]\]/g;

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * 从日记内容中提取 [[标题]] 引用
 * 用于在没有手动 references 字段时自动生成引用列表
 */
export function extractWikiLinksFromContent(
  content: string,
  wikiLinkMap?: WikiLinkMap,
): DiaryReference[] {
  if (!wikiLinkMap) return [];

  const results: DiaryReference[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK_RE.source, 'g');

  while ((match = re.exec(content)) !== null) {
    const captured = match[1];
    if (!captured) continue;
    const title = captured.trim();
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const resolved = wikiLinkMap[key];
    if (resolved) {
      const section = resolved.url.startsWith('/posts') ? 'post' : 'face';
      results.push({
        type: section,
        slug: resolved.url.replace(/^\/(?:posts|faces)/, ''),
        title: resolved.title,
      });
    }
  }

  return results;
}

/**
 * 渲染引用链接列表
 *
 * 支持两种数据来源：
 * 1. 手动 references 字段（DiaryReference[]）
 * 2. 自动从内容中提取的 wiki-link 引用
 *
 * 优先使用手动 references，如果为空则尝试从内容自动提取。
 */
export function renderReferenceLinks(
  refs: DiaryReference[] | undefined,
  content?: string,
  wikiLinkMap?: WikiLinkMap,
) {
  // 手动 references 优先
  const manualRefs = refs && refs.length > 0 ? refs : [];
  // 如果没有手动引用，尝试从内容自动提取
  const autoRefs = manualRefs.length === 0 && content && wikiLinkMap
    ? extractWikiLinksFromContent(content, wikiLinkMap)
    : [];
  const allRefs = [...manualRefs, ...autoRefs];

  if (allRefs.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-zinc-100">
      <p className="text-xs font-medium text-zinc-400 mb-2">引用</p>
      <div className="flex flex-wrap gap-2">
        {allRefs.map((ref: DiaryReference, i: number) => (
          <a
            key={i}
            href={
              ref.type === 'diary'
                ? '#'
                : ref.type === 'face'
                  ? `/faces${ref.slug}`
                  : `/posts${ref.slug}`
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
            target={ref.type === 'diary' ? undefined : '_blank'}
          >
            {ref.title}
          </a>
        ))}
      </div>
    </div>
  );
}
