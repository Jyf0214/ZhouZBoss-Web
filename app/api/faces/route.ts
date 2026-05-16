import { NextRequest, NextResponse } from 'next/server';
import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfigAsync, canAccess, hasDatabase } from '@/lib/config';
import { getSession, SessionPayload } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/faces');

/**
 * 通讯录列表 API
 * 根据认证状态和数据库可用性返回可访问的通讯录条目
 */
export async function GET() {
  const config = await loadConfigAsync();
  const session = await getSession();
  const isAuthenticated = !!session;
  const dbAvailable = hasDatabase();
  const allFiles = getContentFiles('faces');
  const indexes = getContentIndexes('faces');
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  logger.info('GET', '读取通讯录列表');

  const accessibleFiles = allFiles.filter((file) => {
    if (isAdmin) return true;
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    // Must be allowed by config AND explicitly marked as public in markdown
    return canAccess('faces', file.slug, isAuthenticated, dbAvailable, config) &&
      canAccess('faces', dirSlug || '/', isAuthenticated, dbAvailable, config) &&
      file.meta.public === true;
  });

  const accessibleIndexes = indexes.filter((idx) => {
    if (isAdmin) return true;
    return canAccess('faces', idx.slug, isAuthenticated, dbAvailable, config) && idx.public === true;
  });

  logger.info('GET', '通讯录列表读取成功', { count: accessibleFiles.length });
  return NextResponse.json({
    faces: accessibleFiles.map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      tags: f.meta.tags || [],
      description: f.meta.description,
    })),
    indexes: accessibleIndexes.map((idx) => ({
      slug: idx.slug,
      title: idx.title,
      description: idx.description,
      public: idx.public,
      groupName: idx.groupName,
    })),
    site: config.site,
  });
}

/**
 * 检查用户是否有权限管理指定联系人
 */
function canManageFace(session: SessionPayload | null): boolean {
  if (!session) return false;
  return session.role === 'admin' || session.role === 'sudo';
}

/**
 * 生成文件 slug（从姓名生成）
 */
function generateSlug(name: string): string {
  // 简单处理：移除特殊字符，保留中文、字母、数字，用连字符替换空格
  return name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || name;
}

/**
 * 从 GitHub 读取文件内容和元数据
 */
async function getFileFromGitHub(req: NextRequest, filePath: string): Promise<{ sha: string; email: string; raw: string } | null> {
  const url = new URL(req.nextUrl.origin + '/api/github');
  url.searchParams.set('path', filePath);
  
  const response = await fetch(url.toString(), {
    headers: { 'Cookie': req.headers.get('cookie') || '' },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('读取文件失败');
  }

  const data = await response.json();
  return {
    sha: data.sha,
    email: data.frontMatter?.email || '',
    raw: data.raw,
  };
}

/**
 * 创建联系人
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('POST', '无权限', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    logger.info('POST', '创建联系人');
    const { name, email, phone, group, content } = await req.json();

    if (!name || !group) {
      logger.warn('POST', '缺少必填字段');
      return NextResponse.json({ error: '姓名和分组为必填项' }, { status: 400 });
    }

    const slug = generateSlug(name);
    const filePath = `faces/${group}/${slug}.md`;
    const now = new Date().toISOString();

    const frontMatter = {
      title: name,
      name,
      email: email || '',
      phone: phone || '',
      group,
      date: now,
    };

    const message = `feat: add contact "${name}"`;

    const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        path: filePath,
        frontMatter,
        body: content || '',
        message,
      }),
    });

    if (!ghResponse.ok) {
      const error = await ghResponse.json();
      logger.error('POST', '创建联系人失败', { error: error.error });
      return NextResponse.json({ error: error.error || '创建联系人失败' }, { status: 500 });
    }

    logger.info('POST', '联系人创建成功', { slug: `/${group}/${slug}` });
    return NextResponse.json({ success: true, slug: `/${group}/${slug}` });
  } catch (error: unknown) {
    logger.error('POST', '创建联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '创建联系人失败' }, { status: 500 });
  }
}

/**
 * 更新联系人
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('PATCH', '无权限', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { slug, name, email, phone, group, content } = await req.json();

    if (!slug) {
      logger.warn('PATCH', '缺少联系人路径');
      return NextResponse.json({ error: '缺少联系人路径' }, { status: 400 });
    }

    if (!name || !group) {
      logger.warn('PATCH', '缺少必填字段');
      return NextResponse.json({ error: '姓名和分组为必填项' }, { status: 400 });
    }

    const oldFilePath = `faces${slug}.md`;

    // 使用统一的 /api/github 端点读取文件
    const fileData = await getFileFromGitHub(req, oldFilePath);
    if (!fileData) {
      logger.warn('PATCH', '联系人不存在', { slug });
      return NextResponse.json({ error: '联系人不存在' }, { status: 404 });
    }

    const { sha } = fileData;

    if (!canManageFace(session)) {
      logger.warn('PATCH', '无权修改联系人', { slug });
      return NextResponse.json({ error: '无权修改此联系人' }, { status: 403 });
    }

    const newSlug = generateSlug(name);
    const newFilePath = `faces/${group}/${newSlug}.md`;
    const now = new Date().toISOString();

    const frontMatter = {
      title: name,
      name,
      email: email || '',
      phone: phone || '',
      group,
      date: now,
    };

    if (newFilePath !== oldFilePath) {
      // 创建新文件
      const ghCreateResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          path: newFilePath,
          frontMatter,
          body: content || '',
          message: `update: move contact "${name}" to ${newFilePath}`,
        }),
      });

      if (!ghCreateResponse.ok) {
        const error = await ghCreateResponse.json();
        return NextResponse.json({ error: error.error || '更新联系人失败' }, { status: 500 });
      }

      // 删除旧文件
      const ghDeleteResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          path: oldFilePath,
          message: `delete: remove old file ${oldFilePath}`,
          sha,
        }),
      });

      if (!ghDeleteResponse.ok) {
        logger.error('PATCH', '删除旧文件失败', { oldFilePath });
      }

      return NextResponse.json({ success: true, slug: `/${group}/${newSlug}` });
    }

    // 更新同一文件
    const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        path: oldFilePath,
        frontMatter,
        body: content || '',
        message: `update: update contact "${name}"`,
        sha,
      }),
    });

    if (!ghResponse.ok) {
      const error = await ghResponse.json();
      return NextResponse.json({ error: error.error || '更新联系人失败' }, { status: 500 });
    }

    logger.info('PATCH', '联系人更新成功', { slug: `/${group}/${newSlug}` });
    return NextResponse.json({ success: true, slug: `/${group}/${newSlug}` });
  } catch (error: unknown) {
    logger.error('PATCH', '更新联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '更新联系人失败' }, { status: 500 });
  }
}

/**
 * 删除联系人
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('DELETE', '无权限');
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    logger.info('DELETE', '删除联系人');
    const { slug } = await req.json();

    if (!slug) {
      logger.warn('DELETE', '缺少联系人路径');
      return NextResponse.json({ error: '缺少联系人路径' }, { status: 400 });
    }

    const filePath = `faces${slug}.md`;

    // 使用统一的 /api/github 端点读取文件
    const fileData = await getFileFromGitHub(req, filePath);
    if (!fileData) {
      logger.warn('DELETE', '联系人不存在', { slug });
      return NextResponse.json({ error: '联系人不存在' }, { status: 404 });
    }

    const { sha } = fileData;

    if (!canManageFace(session)) {
      logger.warn('DELETE', '无权删除联系人', { slug });
      return NextResponse.json({ error: '无权删除此联系人' }, { status: 403 });
    }

    const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        path: filePath,
        message: `delete: delete contact ${slug}`,
        sha,
      }),
    });

    if (!ghResponse.ok) {
      const error = await ghResponse.json();
      return NextResponse.json({ error: error.error || '删除联系人失败' }, { status: 500 });
    }

    logger.info('DELETE', '联系人删除成功', { slug });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('DELETE', '删除联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '删除联系人失败' }, { status: 500 });
  }
}
