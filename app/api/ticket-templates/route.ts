import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getFileFromGithub, updateFileInGithub } from '@/lib/github';

/**
 * 工单模板 API
 * - 模板存储在 GitHub config/ticket-templates.json
 * - 数据库缓存一份
 */

// 获取所有模板
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const db = getDb();
    
    // 先从数据库读取缓存
    let templatesStr = await db.get('config:ticket-templates');
    let templates = templatesStr ? JSON.parse(templatesStr) : [];
    
    // 尝试从 GitHub 同步最新配置
    const configStr = await db.get('config:main');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.githubRepo && config.githubToken) {
        try {
          const file = await getFileFromGithub(config.githubRepo, config.githubToken, 'config/ticket-templates.json');
          if (file) {
            templates = JSON.parse(file.content);
            // 更新数据库缓存
            await db.set('config:ticket-templates', JSON.stringify(templates));
          }
        } catch (e) {
          // GitHub 文件不存在，使用数据库缓存
        }
      }
    }
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error(JSON.stringify({ type: 'get_templates_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取模板失败' }, { status: 500 });
  }
}

// 创建/更新模板
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id, name, description, fields, priority, autoAssign } = await req.json();
    
    if (!name || !fields) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const db = getDb();
    
    // 获取现有模板
    const templatesStr = await db.get('config:ticket-templates');
    let templates = templatesStr ? JSON.parse(templatesStr) : [];
    
    const templateId = id || `tpl-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    
    const template = {
      id: templateId,
      name,
      description: description || '',
      fields, // [{ name, type, required, options }]
      priority: priority || 'medium',
      autoAssign: autoAssign || null,
      createdAt: id ? templates.find((t: any) => t.id === id)?.createdAt : now,
      updatedAt: now,
    };
    
    if (id) {
      // 更新
      const index = templates.findIndex((t: any) => t.id === id);
      if (index >= 0) {
        templates[index] = template;
      } else {
        templates.push(template);
      }
    } else {
      // 创建
      templates.push(template);
    }
    
    // 同步到 GitHub
    const configStr = await db.get('config:main');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.githubRepo && config.githubToken) {
        await updateFileInGithub({
          repo: config.githubRepo,
          token: config.githubToken,
          path: 'config/ticket-templates.json',
          content: JSON.stringify(templates, null, 2),
          message: `chore: ${id ? 'update' : 'create'} ticket template "${name}"`,
        });
      }
    }
    
    // 更新数据库缓存
    await db.set('config:ticket-templates', JSON.stringify(templates));
    
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error(JSON.stringify({ type: 'save_template_error', message: (error as Error).message }));
    return NextResponse.json({ error: '保存模板失败' }, { status: 500 });
  }
}

// 删除模板
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    
    const db = getDb();
    const templatesStr = await db.get('config:ticket-templates');
    let templates = templatesStr ? JSON.parse(templatesStr) : [];
    
    templates = templates.filter((t: any) => t.id !== id);
    
    // 同步到 GitHub
    const configStr = await db.get('config:main');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.githubRepo && config.githubToken) {
        await updateFileInGithub({
          repo: config.githubRepo,
          token: config.githubToken,
          path: 'config/ticket-templates.json',
          content: JSON.stringify(templates, null, 2),
          message: `chore: delete ticket template`,
        });
      }
    }
    
    await db.set('config:ticket-templates', JSON.stringify(templates));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'delete_template_error', message: (error as Error).message }));
    return NextResponse.json({ error: '删除模板失败' }, { status: 500 });
  }
}
