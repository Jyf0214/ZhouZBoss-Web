import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';

/**
 * 获取单个工单详情
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug: slugParts } = await context.params;
  const slug = '/' + (slugParts?.join('/') || '');
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const env = getEnvConfig();

    if (!env.githubRepo || !env.githubToken) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const filePath = `tickets${slug}.md`;

    const contentRes = await fetch(`/api/github?path=${filePath}`);
    if (!contentRes.ok) {
      return NextResponse.json({ error: '工单不存在' }, { status: 404 });
    }
    const { frontMatter, body } = await contentRes.json();

    // 权限检查：admin/sudo 看全部，普通用户只看自己的
    const isAdmin = session.role === 'admin' || session.role === 'sudo';
    if (!isAdmin && frontMatter.author !== session.email) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    return NextResponse.json({
      slug,
      title: frontMatter.title,
      author: frontMatter.author,
      date: frontMatter.date,
      labels: frontMatter.labels || [],
      status: frontMatter.status || 'open',
      template: frontMatter.template,
      content: body,
    });
  } catch (error) {
    console.error(JSON.stringify({ type: 'get_ticket_error', message: (error as Error).message }));
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
  const slug = '/' + (slugParts?.join('/') || '');
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { status } = await req.json();

    if (!['open', 'in-progress', 'closed'].includes(status)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }

    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const filePath = `tickets${slug}.md`;

    // 读取现有文件
    const existingRes = await fetch(`/api/github?path=${filePath}`);
    if (!existingRes.ok) {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'update_ticket_error', message: (error as Error).message }));
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
