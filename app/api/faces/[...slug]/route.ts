import { NextRequest, NextResponse } from 'next/server';
import { getContentFile } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  
  const config = await loadConfigAsync();
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  const file = getContentFile('faces', fullPath);

  if (!file) {
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 返回联系人数据，包含原始 Markdown 内容
  return NextResponse.json({
    ...file,
    // 原始 Markdown 内容（Front Matter + 正文），读取失败时为空字符串
    rawContent: file.raw ?? '',
  });
}
