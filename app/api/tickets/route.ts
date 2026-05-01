import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTicketTemplate, renderTicketBody } from '@/lib/tickets';
import { getEnvConfig } from '@/lib/env';

/**
 * 创建工单
 * - 根据模板生成 markdown 内容
 * - 提交到 GitHub 仓库的 tickets/ 目录
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { templateSlug, formData, title } = await req.json();

    if (!templateSlug || !formData) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取模板
    const template = getTicketTemplate(templateSlug);
    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 渲染工单内容
    const body = renderTicketBody(template, formData);

    // 生成工单文件名（使用时间戳）
    const timestamp = Date.now().toString(36);
    const slug = `/${template.slug}/${timestamp}`;
    const fileName = `tickets${slug}.md`;

    // 构建 front matter
    const frontMatter: Record<string, any> = {
      title: title || template.title || 'Untitled',
      author: session.email,
      date: new Date().toISOString(),
      labels: template.labels,
      status: 'open',
      assignees: template.assignees,
      template: template.name,
    };

    // 获取 GitHub 配置
    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    // 提交到 GitHub
    const postRes = await fetch('/api/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        path: fileName,
        frontMatter,
        body,
        message: `create ticket: ${frontMatter.title}`,
      }),
    });
    if (!postRes.ok) {
      throw new Error('Failed to create ticket on GitHub');
    }
    const result = await postRes.json();

    return NextResponse.json({ success: true, slug, result });
  } catch (error) {
    console.error(JSON.stringify({ type: 'create_ticket_error', message: (error as Error).message }));
    return NextResponse.json({ error: '创建工单失败' }, { status: 500 });
  }
}

/**
 * 获取工单列表（从 GitHub 读取）
 * - Admin/Sudo 可见全部
 * - 普通用户只能看自己的
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    // 列出 tickets/ 目录下的文件
    const listRes = await fetch(`/api/github?path=tickets`);
    if (!listRes.ok) {
      if (listRes.status === 404) return NextResponse.json([]);
      throw new Error('Failed to list tickets from GitHub');
    }
    const data = await listRes.json();

    if (!Array.isArray(data)) {
      return NextResponse.json([]);
    }

    // 读取每个工单文件
    const tickets = await Promise.all(
      data.map(async (file: any) => {
        try {
          const contentRes = await fetch(`/api/github?path=${file.path}`);
          if (!contentRes.ok) return null;
          const { frontMatter } = await contentRes.json();

          const author = frontMatter.author;
          const isAdmin = session.role === 'admin' || session.role === 'sudo';

          // 权限控制：admin/sudo 看全部，普通用户只看自己的
          if (!isAdmin && author !== session.email) {
            return null;
          }

          return {
            slug: file.path.replace(/^tickets/, '').replace(/\.md$/, ''),
            title: frontMatter.title || file.name,
            author,
            date: frontMatter.date,
            labels: frontMatter.labels || [],
            status: frontMatter.status || 'open',
            template: frontMatter.template,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json(tickets.filter(Boolean));
  } catch (error: any) {
    if (error.status === 404) {
      return NextResponse.json([]);
    }
    console.error(JSON.stringify({ type: 'list_tickets_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取工单列表失败' }, { status: 500 });
  }
}
