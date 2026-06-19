import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig } from '@/lib/config';
import { getSiteUrl } from '@/const/url';
import type { ContentFile } from '@/types/content';

/**
 * Feed 生成共用工具函数
 *
 * 为 RSS 2.0 和 Atom 1.0 两种格式提供统一的数据获取与 XML 处理能力。
 */

/** 单篇公开文章 */
export type PublicPost = ContentFile;

/**
 * 获取公开文章列表（按日期降序）
 *
 * 逻辑与原 feed.xml 一致：排除 index.md 标记为 private 的目录下的文章。
 */
export function getPublicPosts(): PublicPost[] {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });

  return publicFiles;
}

/**
 * 获取按标签过滤的公开文章列表
 */
export function getPostsByTag(tag: string): PublicPost[] {
  return getPublicPosts().filter((file) => {
    const tags = file.meta.tags;
    if (!tags || !Array.isArray(tags)) return false;
    return tags.some((t) => t.toLowerCase() === tag.toLowerCase());
  });
}

/** 获取所有已使用的标签（附带文章数量） */
export function getAllTags(): { tag: string; count: number }[] {
  const posts = getPublicPosts();
  const tagMap = new Map<string, number>();

  for (const post of posts) {
    const tags = post.meta.tags;
    if (!tags || !Array.isArray(tags)) continue;
    for (const tag of tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/** Feed 项目上限 */
export const FEED_ITEM_LIMIT = 20;

/** 获取站点配置中的 Feed 相关信息 */
export function getFeedConfig() {
  const config = loadConfig();
  const siteUrl = getSiteUrl();

  return {
    siteUrl,
    title: config.site.title,
    description: config.site.description,
    language: config.site.lang || 'zh-CN',
  };
}

/**
 * RFC 822 日期格式化（RSS 标准）
 */
export function toRfc822(input: string | undefined): string {
  if (!input) return new Date().toUTCString();
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

/**
 * ISO 8601 日期格式化（Atom 标准）
 */
export function toIso8601(input: string | undefined): string {
  if (!input) return new Date().toISOString();
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * XML 特殊字符转义
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 极简 Markdown 剥离：用于从正文生成摘要
 * 不追求完美，仅去除明显影响阅读体验的语法标记
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[#>*_~\-]+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 生成文章摘要（description）
 * 优先使用 front matter 中的 description，否则从正文剥离 markdown 生成
 */
export function buildDescription(meta: { description?: string }, content: string): string {
  return (meta.description ?? stripMarkdown(content)).slice(0, 200);
}

/**
 * 获取文章 URL
 */
export function getPostUrl(siteUrl: string, slug: string): string {
  return `${siteUrl}/posts${slug}`;
}
