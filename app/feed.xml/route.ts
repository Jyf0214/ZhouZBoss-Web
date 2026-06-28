import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';
import {
  getPublicPosts,
  getFeedConfig,
  FEED_ITEM_LIMIT,
  toRfc822,
  escapeXml,
  buildDescription,
  getPostUrl,
  type PublicPost,
} from '@/lib/feed';

/**
 * RSS 2.0 Feed（含完整正文）
 *
 * 路由：/feed.xml
 * 数据源：posts 目录下全部公开的 Markdown 文件
 * 内容：按日期降序最多 20 篇
 *   - title、link、pubDate、guid（标准 RSS 字段）
 *   - description（摘要，200 字以内）
 *   - content:encoded（完整文章正文，CDATA 包裹）
 *
 * 站点元信息（标题/描述/语言）从 config.yaml 的 site 段读取，
 * 与首页 metadata 保持一致。
 */
export const dynamic = 'force-static';
export const revalidate = false;

export function GET(_request: NextRequest): NextResponse {
  const { siteUrl, title, description, language } = getFeedConfig();
  const allPosts = getPublicPosts();
  const recentPosts = allPosts.slice(0, FEED_ITEM_LIMIT);

  const lastBuildDate = recentPosts[0]?.meta.date
    ? toRfc822(recentPosts[0].meta.date)
    : new Date().toUTCString();

  const itemsXml = recentPosts
    .map((post) => buildRssItem(post, siteUrl))
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function buildRssItem(post: PublicPost, siteUrl: string): string {
  const link = getPostUrl(siteUrl, post.slug);
  const title = post.meta.title || path.basename(post.slug);
  const description = buildDescription(post.meta, post.content);
  const pubDate = toRfc822(post.meta.date);
  const guid = post.slug;
  // 完整正文使用 CDATA 包裹，避免 XML 转义问题
  // 转义 ]] sequences 防止 CDATA 注入
  const contentEncoded = `<![CDATA[${post.content.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(description)}</description>
      <content:encoded>${contentEncoded}</content:encoded>
    </item>`;
}
