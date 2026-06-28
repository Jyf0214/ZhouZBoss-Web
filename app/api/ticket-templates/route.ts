import { NextResponse } from 'next/server';
import { getTicketTemplates } from '@/lib/tickets';
import yaml from 'js-yaml';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/ticket-templates');

/**
 * 工单模板 API
 * - 模板来自 /tickets 目录的 markdown 文件
 * - GET: 从文件系统读取
 * - POST: 创建新模板（admin/sudo）
 */

// 获取所有模板
export const GET = apiHandler('GET', { label: '获取模板列表', requireAuth: true }, () => {
  logger.info('GET', '获取模板列表');
  const templates = getTicketTemplates();
  logger.info('GET', '获取模板列表成功', { count: templates.length });
  // 工单模板缓存：CDN 缓存 300s，过期后后台重验证 600s
  return NextResponse.json(templates, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
});

// 创建新模板（仅 admin/sudo）
export const POST = apiHandler('POST', { label: '创建模板', requireAdmin: true }, async (req) => {
  const body = await req.json();
  const { name, description, title, labels, assignees, fields, body: templateBody } = body;

  if (!name || !templateBody) {
    logger.warn('POST', '缺少必需字段');
    return NextResponse.json({ error: '缺少必需字段' }, { status: 400 });
  }

  logger.info('POST', '创建模板', { name });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `${slug}.md`;
  const filePath = `tickets/${fileName}`;

  const frontMatter: Record<string, unknown> = {
    name,
    description: description ?? '',
    title: title ?? `[${name}] `,
    labels: labels ?? [],
    assignees: assignees ?? [],
    fields: (fields ?? []).map((f: Record<string, unknown>) => ({
      name: f.name,
      label: f.label,
      type: f.type ?? 'input',
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
    return NextResponse.json({ error: err.error ?? '创建模板失败' }, { status: 500 });
  }

  logger.info('POST', '模板创建成功', { slug: `/${slug}` });
  return NextResponse.json({ success: true, slug: `/${slug}` });
});

// 删除模板（仅 admin/sudo）
export const DELETE = apiHandler('DELETE', { label: '删除模板', requireAdmin: true }, async (req) => {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    logger.warn('DELETE', '缺少模板 ID');
    return NextResponse.json({ error: '缺少模板 ID' }, { status: 400 });
  }

  // id 是 slug（如 '/my-template'），去掉前导 /
  const slug = id.startsWith('/') ? id.slice(1) : id;
  // 路径穿越防护
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return NextResponse.json({ error: '无效的模板 ID' }, { status: 400 });
  }
  const filePath = `tickets/${slug}.md`;

  logger.info('DELETE', '删除模板', { slug, filePath });

  const githubRes = await fetch(`${new URL(req.url).origin}/api/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete',
      path: filePath,
      message: `delete: ticket template ${slug}`,
    }),
  });

  if (!githubRes.ok) {
    const err = await githubRes.json();
    return NextResponse.json({ error: err.error ?? '删除模板失败' }, { status: 500 });
  }

  logger.info('DELETE', '模板删除成功', { slug });
  return NextResponse.json({ success: true });
});
