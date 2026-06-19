import { getContentFiles, getContentIndexes } from '@/lib/content';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/tags');

/**
 * 标签聚合 API — 从所有公开文章的 frontmatter tags 字段聚合
 * 返回所有标签及每个标签的文章数量
 */
export function GET() {
  logger.info('GET', '读取标签聚合数据');

  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅统计公开文章的标签
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });

  // 聚合标签及文章数量
  const tagMap = new Map<string, number>();
  for (const file of publicFiles) {
    for (const tag of file.meta.tags ?? []) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  // 按数量降序排序，数量相同按标签名排序
  const tags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  logger.info('GET', '标签聚合完成', { tagCount: tags.length, articleCount: publicFiles.length });

  return Response.json(
    { tags },
    {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}
