/**
 * 后向链接 API
 *
 * GET /api/backlinks?section=posts&slug=/daily/2024-01-15
 *
 * 返回：
 * - backlinks: 引用了当前内容的其他内容列表
 * - outgoing: 当前内容引用的其他内容列表
 *
 * 复用 lib/content-registry.ts 的注册表和索引查询。
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getBacklinks, getOutgoingReferences } from '@/lib/content-registry';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/backlinks');

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section');
  const slug = searchParams.get('slug');

  if (
    !section ||
    !slug ||
    (section !== 'posts' && section !== 'faces')
  ) {
    return NextResponse.json(
      { error: '参数无效：需要 section (posts|faces) 和 slug' },
      { status: 400 },
    );
  }

  logger.info('GET', '查询后向链接', { section, slug });

  try {
    const backlinks = getBacklinks(section, slug);
    const outgoing = getOutgoingReferences(section, slug);

    return NextResponse.json({ backlinks, outgoing });
  } catch (err) {
    logger.error('GET', '查询后向链接失败', { section, slug, error: String(err) });
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 },
    );
  }
}
