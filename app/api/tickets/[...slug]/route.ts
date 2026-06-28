import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/tickets/[...slug]');

/** 校验 slug 各段不含路径穿越字符 */
function isValidSlug(slugParts: string[]): boolean {
  return slugParts.every(part => part && !part.includes('..') && !part.includes('\\'));
}

/**
 * 获取单个工单详情
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug: slugParts } = await context.params;
  if (!slugParts || !isValidSlug(slugParts)) {
    return NextResponse.json({ error: '无效的路径' }, { status: 400 });
  }
  const slug = '/' + slugParts.join('/');
  const session = await getSession();
  if (!session) {
    logger.warn('GET', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    logger.info('GET', '获取工单详情', { slug });
    const env = getEnvConfig();

    if (!env.githubRepo || !env.githubToken) {
      logger.error('GET', 'GitHub 配置缺失');
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const filePath = `tickets${slug}.md`;

    const contentRes = await fetch(`/api/github?path=${filePath}`);
    if (!contentRes.ok) {
      logger.warn('GET', '工单不存在', { slug });
      return NextResponse.json({ error: '工单不存在' }, { status: 404 });
    }
    const { frontMatter, body } = await contentRes.json();

    // 权限检查：admin/sudo 看全部，普通用户只看自己的
    const isAdmin = session.role === 'admin' || session.role === 'sudo';
    if (!isAdmin && frontMatter.author !== session.email) {
      logger.warn('GET', '无权限访问工单', { slug });
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    logger.info('GET', '工单详情获取成功', { slug });
    return NextResponse.json({
      slug,
      title: frontMatter.title,
      author: frontMatter.author,
      date: frontMatter.date,
      labels: frontMatter.labels ?? [],
      status: frontMatter.status ?? 'open',
      template: frontMatter.template,
      content: body,
    });
  } catch (error) {
    logger.error('GET', '获取工单失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '获取工单失败' }, { status: 500 });
  }
}

/**
 * 更新工单状态（仅 admin/sudo）
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug: slugParts } = await context.params;
  if (!slugParts || !isValidSlug(slugParts)) {
    return NextResponse.json({ error: '无效的路径' }, { status: 400 });
  }
  const slug = '/' + slugParts.join('/');
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('PATCH', '无权限', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { status } = await req.json();

    if (!['open', 'in-progress', 'closed'].includes(status)) {
      logger.warn('PATCH', '无效状态', { status });
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }

    logger.info('PATCH', '更新工单状态', { slug, status });
    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      logger.error('PATCH', 'GitHub 配置缺失');
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const filePath = `tickets${slug}.md`;

    // 读取现有文件
    const existingRes = await fetch(`/api/github?path=${filePath}`);
    if (!existingRes.ok) {
      logger.warn('PATCH', '工单不存在', { slug });
      return NextResponse.json({ error: '工单不存在' }, { status: 404 });
    }
    const { frontMatter, body, sha } = await existingRes.json();

    // 更新状态
    frontMatter.status = status;

    // 提交到 GitHub
    const patchRes = await fetch('/api/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        path: filePath,
        frontMatter,
        body,
        sha,
        message: `chore: update ticket status to ${status}`,
      }),
    });
    if (!patchRes.ok) {
      throw new Error('Failed to update ticket on GitHub');
    }

    logger.info('PATCH', '工单状态更新成功', { slug, status });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('PATCH', '更新工单失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
