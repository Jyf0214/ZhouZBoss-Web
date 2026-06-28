import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';
import {
  getPostsByTag,
  getFeedConfig,
  FEED_ITEM_LIMIT,
  toRfc822,
  escapeXml,
  buildDescription,
  getPostUrl,
  type PublicPost,
} from '@/lib/feed';

/**
 * 按标签订阅的 RSS 2.0 Feed（含完整正文）
 *
 * 路由：/feed/[tag].xml
 * 数据源：posts 目录下匹配指定标签的公开文章
 * 内容：按日期降序最多 20 篇，格式与 /feed.xml 一致
 *
 * 示例：/feed/TypeScript.xml、/feed/日记.xml
 */
export const dynamic = 'force-static';
export const revalidate = false;

export async function generateStaticParams(): Promise<{ tag: string }[]> {
  // 收集所有已使用的标签
  const { getContentFiles } = await import('@/lib/content');
  const allFiles = getContentFiles('posts');
  const tagSet = new Set<string>();

  for (const file of allFiles) {
    const tags = file.meta.tags;
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet).map((tag) => ({ tag }));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> },
): Promise<NextResponse> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const { siteUrl, title, description, language } = getFeedConfig();
  const posts = getPostsByTag(decodedTag).slice(0, FEED_ITEM_LIMIT);

  if (posts.length === 0) {
    // 标签不存在或无文章，返回空 feed
    const emptyXml = buildEmptyFeed(siteUrl, title, description, language, decodedTag);
    return new NextResponse(emptyXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  const lastBuildDate = posts[0]?.meta.date
    ? toRfc822(posts[0].meta.date)
    : new Date().toUTCString();

  const itemsXml = posts
    .map((post) => buildRssItem(post, siteUrl))
    .join('\n');

  const tagTitle = `${title} - ${decodedTag}`;
  const tagDescription = `标签「${decodedTag}」下的文章`;
  const feedUrl = `${siteUrl}/feed/${encodeURIComponent(decodedTag)}.xml`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(tagTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(tagDescription)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
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

function buildEmptyFeed(
  siteUrl: string,
  title: string,
  description: string,
  language: string,
  tag: string,
): string {
  const feedUrl = `${siteUrl}/feed/${encodeURIComponent(tag)}.xml`;
  const tagTitle = `${title} - ${tag}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(tagTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(`标签「${tag}」下的文章`)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
  </channel>
</rss>`;
}
