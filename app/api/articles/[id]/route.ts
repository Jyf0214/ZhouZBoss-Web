import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Article Detail API (GET, PATCH, DELETE)
 *
 * - GET：草稿从数据库读内容，已发布通过 /api/github GET 端点读取
 * - PATCH：发布时通过 /api/github POST 端点推送 GitHub；草稿更新存数据库
 * - DELETE：通过 /api/github POST 端点删除 GitHub 文件 + 数据库记录
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const db = getDb();

    // 1. 先查数据库（草稿或已发布的备份元数据）
    const metaStr = await db.get(`article:data:${id}`);
    if (metaStr) {
      const meta = JSON.parse(metaStr);

      // 草稿：内容直接在数据库
      if (meta.status === 'draft') {
        return NextResponse.json(meta);
      }

      // 已发布：通过 /api/github GET 端点获取内容
      if (meta.status === 'published' && meta.slug) {
        const ghResponse = await fetch(
          `${req.nextUrl.origin}/api/github?path=posts${meta.slug}.md`
        );
        if (ghResponse.ok) {
          const { frontMatter, body } = await ghResponse.json();
          return NextResponse.json({
            ...meta,
            title: frontMatter.title || meta.title,
            content: body || '',
            author: frontMatter.author || meta.authorName,
            tags: frontMatter.tags || meta.tags || [],
            cover: frontMatter.cover || meta.coverImage,
            description: frontMatter.description || meta.description,
            date: frontMatter.date || meta.createdAt,
          });
        }
      }

      return NextResponse.json(meta);
    }

    // 2. 数据库无记录，尝试从 posts/ 文件系统索引查找
    const { getContentFile } = await import('@/lib/content');
    // id 可能是 slug 格式（如 /travel-in-China/beijing）
    const file = getContentFile('posts', id.startsWith('/') ? id : `/${id}`);
    if (file) {
      return NextResponse.json({
        id: file.slug,
        slug: file.slug,
        title: file.meta.title,
        content: file.content,
        author: file.meta.author,
        date: file.meta.date,
        tags: file.meta.tags || [],
        cover: file.meta.cover,
        description: file.meta.description,
        status: 'published',
      });
    }

    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  } catch (error) {
    console.error(JSON.stringify({ type: 'get_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    const metaStr = await db.get(`article:data:${id}`);

    if (!metaStr) return NextResponse.json({ error: '文章不存在' }, { status: 404 });

    const meta = JSON.parse(metaStr);

    // 权限检查
    if (meta.authorId !== session.uid && session.role !== 'admin' && session.role !== 'sudo') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const updated = {
      ...meta,
      ...body,
      content: body.content !== undefined ? body.content : meta.content,
      updatedAt: new Date().toISOString(),
    };

    // 发布操作：通过 /api/github POST 端点推送到 GitHub posts/ 目录
    if (body.status === 'published') {
      const postSlug = body.slug || meta.slug || `/${updated.authorName}/${id}`;
      const filePath = `posts${postSlug}.md`;

      const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          path: filePath,
          frontMatter: {
            title: updated.title,
            author: updated.authorName,
            date: updated.createdAt,
            tags: updated.tags || [],
            ...(updated.coverImage && { cover: updated.coverImage }),
            ...(updated.description && { description: updated.description }),
          },
          body: updated.content || '',
          message: `feat: publish post "${updated.title}"`,
        }),
      });

      if (!ghResponse.ok) {
        const error = await ghResponse.json();
        return NextResponse.json({ error: error.error || '发布到 GitHub 失败' }, { status: 500 });
      }

      // 发布后数据库仅保留备份元数据（不含内容）
      updated.status = 'published';
      updated.slug = postSlug;
      updated.content = '';
      await db.set(`article:data:${id}`, JSON.stringify(updated));
      await db.hset('articles:published', id, JSON.stringify(updated));
      // 从草稿列表移除
      await db.hdel('articles:drafts', id);

      return NextResponse.json({ success: true, slug: postSlug });
    }

    // 草稿更新：存数据库
    await db.set(`article:data:${id}`, JSON.stringify(updated));
    await db.hset('articles:drafts', id, JSON.stringify(updated));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'update_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '更新文章失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const db = getDb();
    const metaStr = await db.get(`article:data:${id}`);

    if (!metaStr) return NextResponse.json({ error: '文章不存在' }, { status: 404 });

    const meta = JSON.parse(metaStr);

    // 管理员直接永久删除
    if (session.role === 'admin' || session.role === 'sudo') {
      // 删除 GitHub 文件（通过 /api/github POST 端点）
      if (meta.status === 'published' && meta.slug) {
        await fetch(`${req.nextUrl.origin}/api/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            path: `posts${meta.slug}.md`,
            message: `delete: remove post "${meta.title}"`,
          }),
        });
      }

      // 删除数据库记录
      await db.del(`article:data:${id}`);
      await db.hdel('articles:drafts', id);
      await db.hdel('articles:published', id);

      return NextResponse.json({ success: true, message: '已永久删除' });
    }

    // 普通用户：进入删除队列
    if (meta.authorId !== session.uid) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const deletionInfo = {
      ...meta,
      status: 'pending_deletion',
      deletionRequestedAt: new Date().toISOString(),
    };
    await db.set(`article:data:${id}`, JSON.stringify(deletionInfo));
    await db.hdel('articles:drafts', id);
    await db.hset('articles:drafts', id, JSON.stringify(deletionInfo));

    return NextResponse.json({ success: true, message: '已提交删除申请，30天后自动删除' });
  } catch (error) {
    console.error(JSON.stringify({ type: 'delete_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '删除文章失败' }, { status: 500 });
  }
}
