import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';
import {
  getPublicPosts,
  getFeedConfig,
  FEED_ITEM_LIMIT,
  toIso8601,
  escapeXml,
  buildDescription,
  getPostUrl,
  type PublicPost,
} from '@/lib/feed';

/**
 * Atom 1.0 Feed（含完整正文）
 *
 * 路由：/feed.atom
 * 数据源：posts 目录下全部公开的 Markdown 文件
 * 内容：按日期降序最多 20 篇
 *   - id、title、link、updated、summary（标准 Atom 字段）
 *   - content type="text"（完整文章正文）
 *
 * Atom 规范：https://www.ietf.org/rfc/rfc4287.txt
 */
export const dynamic = 'force-static';
export const revalidate = false;

export function GET(_request: NextRequest): NextResponse {
  const { siteUrl, title, description, language } = getFeedConfig();
  const allPosts = getPublicPosts();
  const recentPosts = allPosts.slice(0, FEED_ITEM_LIMIT);

  const lastUpdated = recentPosts[0]?.meta.date
    ? toIso8601(recentPosts[0].meta.date)
    : new Date().toISOString();

  const entriesXml = recentPosts
    .map((post) => buildAtomEntry(post, siteUrl))
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(language)}">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="${escapeXml(siteUrl)}" rel="alternate" type="text/html" />
  <link href="${escapeXml(`${siteUrl}/feed.atom`)}" rel="self" type="application/atom+xml" />
  <id>${escapeXml(siteUrl)}</id>
  <updated>${escapeXml(lastUpdated)}</updated>
${entriesXml}
</feed>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function buildAtomEntry(post: PublicPost, siteUrl: string): string {
  const link = getPostUrl(siteUrl, post.slug);
  const title = post.meta.title || path.basename(post.slug);
  const summary = buildDescription(post.meta, post.content);
  const updated = toIso8601(post.meta.date);
  const id = `${siteUrl}/posts${post.slug}`;
  // 完整正文以纯文本形式放在 content 中
  const content = escapeXml(post.content);

  return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(link)}" rel="alternate" type="text/html" />
    <id>${escapeXml(id)}</id>
    <updated>${escapeXml(updated)}</updated>
    <summary>${escapeXml(summary)}</summary>
    <content type="text">${content}</content>
  </entry>`;
}
