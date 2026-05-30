import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { encryptContent } from '@/lib/diary-crypto';

const logger = createApiLogger('/api/diary');

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const startDate = searchParams.get('startDate')?.trim();
    const endDate = searchParams.get('endDate')?.trim();

    const ands: Record<string, unknown>[] = [];

    if (search) {
      ands.push({
        OR: [
          { title: { contains: search } },
          { tags: { has: search } },
        ],
      });
    }

    if (startDate) {
      ands.push({ date: { gte: new Date(startDate) } });
    }
    if (endDate) {
      ands.push({ date: { lte: new Date(endDate) } });
    }

    const where = ands.length > 0 ? { AND: ands } : {};

    const diaries = await prisma.diary.findMany({
      where,
      orderBy: [
        { pinned: 'desc' },
        { date: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        tags: true,
        date: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ diaries });
  } catch {
    logger.error('GET', '获取日记列表失败');
    return NextResponse.json({ error: '获取日记列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { title, content, tags, date } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const encrypted = await encryptContent(content);

    const diary = await prisma.diary.create({
      data: {
        title,
        content: encrypted,
        tags: tags ?? [],
        date: date ? new Date(date) : undefined,
      },
    });

    logger.info('POST', '创建日记成功', { id: diary.id, title });
    return NextResponse.json({ diary }, { status: 201 });
  } catch {
    logger.error('POST', '创建日记失败');
    return NextResponse.json({ error: '创建日记失败' }, { status: 500 });
  }
}
