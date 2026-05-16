import { NextRequest, NextResponse } from 'next/server';
import { getTicketTemplates } from '@/lib/tickets';
import { getSession } from '@/lib/auth';
import yaml from 'js-yaml';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/ticket-templates');

/**
 * 工单模板 API
 * - 模板来自 /tickets 目录的 markdown 文件
 * - GET: 从文件系统读取
 * - POST: 创建新模板（admin/sudo）
 */

// 获取所有模板
export async function GET() {
  const session = await getSession();
  if (!session) {
    logger.warn('GET', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    logger.info('GET', '获取模板列表');
    const templates = getTicketTemplates();
    logger.info('GET', '模板列表获取成功', { count: templates.length });
    return NextResponse.json(templates);
  } catch (error) {
    logger.error('GET', '获取模板失败', { error: (error as Error).message });
    return NextResponse.json({ error: '获取模板失败' }, { status: 500 });
  }
}

// 创建新模板（仅 admin/sudo）
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    logger.warn('POST', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  if (session.role !== 'admin' && session.role !== 'sudo') {
    logger.warn('POST', '需要管理员权限', { role: session.role });
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  try {
    logger.info('POST', '创建模板');
    const body = await req.json();
    const { name, description, title, labels, assignees, fields, body: templateBody } = body;

    if (!name || !templateBody) {
      logger.warn('POST', '缺少必需字段');
      return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug}.md`;
    const filePath = `tickets/${fileName}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const frontMatter: any = {
      name,
      description: description || '',
      title: title || `[${name}] `,
      labels: labels || [],
      assignees: assignees || [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fields: (fields || []).map((f: any) => ({
        name: f.name,
        label: f.label,
        type: f.type || 'input',
        ...(f.options ? { options: f.options } : {}),
        required: f.required !== false,
      })),
    };

    const fileContent = `---\n${yaml.dump(frontMatter)}---\n\n${templateBody}`;

    const githubRes = await fetch(`${new URL(req.url).origin}/api/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        path: filePath,
        content: fileContent,
        message: `feat: add ticket template ${name}`,
      }),
    });

    if (!githubRes.ok) {
      const err = await githubRes.json();
      return NextResponse.json({ error: err.error || '创建模板失败' }, { status: 500 });
    }

    logger.info('POST', '模板创建成功', { slug: `/${slug}` });
    return NextResponse.json({ success: true, slug: `/${slug}` });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('POST', '创建模板失败', { error: error.message });
    return NextResponse.json({ error: '创建模板失败' }, { status: 500 });
  }
}
