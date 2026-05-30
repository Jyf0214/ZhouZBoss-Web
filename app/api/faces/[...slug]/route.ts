import { type NextRequest, NextResponse } from 'next/server';
import { getContentFile } from '@/lib/content';
import { loadConfig, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/faces/[...slug]');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  logger.info('GET', '读取联系人详情', { fullPath });
  
  const config = loadConfig();
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  const file = getContentFile('faces', fullPath);

  if (!file) {
    logger.warn('GET', '联系人不存在', { fullPath });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check access
  const dirSlug = '/' + slug.slice(0, -1).join('/');
  const isAccessible = isAdmin || (
    canAccess('faces', fullPath, isAuthenticated, dbAvailable, config) &&
    canAccess('faces', dirSlug || '/', isAuthenticated, dbAvailable, config) &&
    file.meta.public === true
  );

  if (!isAccessible) {
    logger.warn('GET', '无权访问联系人', { fullPath });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  logger.info('GET', '联系人读取成功', { fullPath });
  // 返回联系人数据，包含原始 Markdown 内容
  return NextResponse.json({
    ...file,
    // 原始 Markdown 内容（Front Matter + 正文），读取失败时为空字符串
    rawContent: file.raw ?? '',
  });
}
