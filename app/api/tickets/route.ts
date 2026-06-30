import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTicketTemplate, renderTicketBody } from '@/lib/tickets';
import { getEnvConfig } from '@/lib/env';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/tickets');

/**
 * 校验工单创建输入
 */
function validateTicketInput(templateSlug: unknown, formData: unknown, title: unknown): NextResponse | null {
  if (!templateSlug || !formData) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }
  if (typeof formData !== 'object' || formData === null || Array.isArray(formData)) {
    return NextResponse.json({ error: 'formData 必须是对象' }, { status: 400 });
  }
  const trimmedTitle = (title as string | undefined)?.trim();
  if (trimmedTitle && trimmedTitle.length > 200) {
    return NextResponse.json({ error: '标题长度不能超过 200 字符' }, { status: 400 });
  }
  return null;
}

/**
 * 创建工单
 * - 根据模板生成 markdown 内容
 * - 提交到 GitHub 仓库的 tickets/ 目录
 */
export const POST = apiHandler('POST', { label: '创建工单', requireAuth: true }, async (req) => {
  const session = (await getSession())!;
  const { templateSlug, formData, title } = await req.json();

  const validationErr = validateTicketInput(templateSlug, formData, title);
  if (validationErr) {
    logger.warn('POST', '输入校验失败');
    return validationErr;
  }

  logger.info('POST', '创建工单', { templateSlug });

  const template = getTicketTemplate(templateSlug);
  if (!template) {
    logger.warn('POST', '模板不存在', { templateSlug });
    return NextResponse.json({ error: '模板不存在' }, { status: 404 });
  }

  const body = renderTicketBody(template, formData);

  const timestamp = Date.now().toString(36);
  const slug = `/${template.slug}/${timestamp}`;
  const fileName = `tickets${slug}.md`;

  const frontMatter: Record<string, unknown> = {
    title: title?.trim() || template.title || 'Untitled',
    author: session.email,
    date: new Date().toISOString(),
    labels: template.labels,
    status: 'open',
    assignees: template.assignees,
    template: template.name,
  };

  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('POST', 'GitHub 配置缺失');
    return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
  }

  const postRes = await fetch(`${req.nextUrl.origin}/api/github`, {
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
  await postRes.json();

  logger.info('POST', '工单创建成功', { slug });
  return NextResponse.json({ success: true, slug });
});

/**
 * 获取工单列表（从 GitHub 读取）
 * - Admin/Sudo 可见全部
 * - 普通用户只能看自己的
 */
export const GET = apiHandler('GET', { label: '获取工单列表', requireAuth: true }, async (req) => {
  const session = (await getSession())!;
  logger.info('GET', '获取工单列表');
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('GET', 'GitHub 配置缺失');
    return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
  }

  // 列出 tickets/ 目录下的文件
  const listRes = await fetch(`${req.nextUrl.origin}/api/github?path=tickets`);
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
    data.map(async (file: { path: string; name: string }) => {
      try {
        const contentRes = await fetch(`${req.nextUrl.origin}/api/github?path=${encodeURIComponent(file.path)}`);
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
          title: frontMatter.title ?? file.name,
          author,
          date: frontMatter.date,
          labels: frontMatter.labels ?? [],
          status: frontMatter.status ?? 'open',
          template: frontMatter.template,
        };
      } catch {
        return null;
      }
    })
  );

  logger.info('GET', '工单列表获取成功', { count: tickets.filter(Boolean).length });
  return NextResponse.json(tickets.filter(Boolean));
});
