import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { encryptContent, decryptContent } from '@/lib/diary-crypto';

const logger = createApiLogger('/api/diary/[id]');

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { id } = await params;
    const diary = await prisma.diary.findUnique({ where: { id } });
    if (!diary) {
      return NextResponse.json({ error: '日记不存在' }, { status: 404 });
    }

    const decrypted = await decryptContent(diary.content);

    return NextResponse.json({ diary: { ...diary, content: decrypted } });
  } catch {
    logger.error('GET', '获取日记失败');
    return NextResponse.json({ error: '获取日记失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { id } = await params;
    const { title, content, tags, date } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const existing = await prisma.diary.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '日记不存在' }, { status: 404 });
    }

    const encrypted = await encryptContent(content);

    const diary = await prisma.diary.update({
      where: { id },
      data: {
        title,
        content: encrypted,
        tags: tags ?? [],
        date: date ? new Date(date) : undefined,
      },
    });

    logger.info('PUT', '更新日记成功', { id, title });
    return NextResponse.json({ diary });
  } catch {
    logger.error('PUT', '更新日记失败');
    return NextResponse.json({ error: '更新日记失败' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.diary.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '日记不存在' }, { status: 404 });
    }

    const diary = await prisma.diary.update({
      where: { id },
      data: { pinned: !existing.pinned },
      select: { id: true, pinned: true },
    });

    logger.info('PATCH', `${diary.pinned ? '置顶' : '取消置顶'}日记成功`, { id });
    return NextResponse.json({ diary });
  } catch {
    logger.error('PATCH', '切换置顶状态失败');
    return NextResponse.json({ error: '切换置顶状态失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.diary.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '日记不存在' }, { status: 404 });
    }

    await prisma.diary.delete({ where: { id } });

    logger.info('DELETE', '删除日记成功', { id });
    return NextResponse.json({ success: true });
  } catch {
    logger.error('DELETE', '删除日记失败');
    return NextResponse.json({ error: '删除日记失败' }, { status: 500 });
  }
}
