import { NextRequest, NextResponse } from 'next/server';
import { getTicketTemplates } from '@/lib/tickets';
import { getSession } from '@/lib/auth';
import yaml from 'js-yaml';

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
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const templates = getTicketTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error(JSON.stringify({ type: 'get_templates_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取模板失败' }, { status: 500 });
  }
}

// 创建新模板（仅 admin/sudo）
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  if (session.role !== 'admin' && session.role !== 'sudo') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, title, labels, assignees, fields, body: templateBody } = body;

    if (!name || !templateBody) {
      return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug}.md`;
    const filePath = `tickets/${fileName}`;

    const frontMatter: any = {
      name,
      description: description || '',
      title: title || `[${name}] `,
      labels: labels || [],
      assignees: assignees || [],
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

    return NextResponse.json({ success: true, slug: `/${slug}` });
  } catch (error: any) {
    console.error('create_template_error:', error.message);
    return NextResponse.json({ error: '创建模板失败' }, { status: 500 });
  }
}
