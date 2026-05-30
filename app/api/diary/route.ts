import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { encryptContent } from '@/lib/diary-crypto';

const logger = createApiLogger('/api/diary');

export const GET = apiHandler('GET', { label: '获取日记列表', requireAdmin: true }, async (req) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim();
  const startDate = searchParams.get('startDate')?.trim();
  const endDate = searchParams.get('endDate')?.trim();
  const group = searchParams.get('group')?.trim();

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
  if (group) {
    ands.push({ group });
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
      group: true,
      references: true,
      date: true,
      pinned: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 收集所有已有的分组名
  const allGroups = await prisma.diary.findMany({
    select: { group: true },
    distinct: ['group'],
    where: { group: { not: null } },
  });

  return NextResponse.json({ diaries, groups: allGroups.map((g) => g.group).filter(Boolean) });
});

export const POST = apiHandler('POST', { label: '创建日记', requireAdmin: true }, async (req) => {
  const { title, content, tags, date, group, references } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
  }

  const encrypted = await encryptContent(content);

  const diary = await prisma.diary.create({
    data: {
      title,
      content: encrypted,
      tags: tags ?? [],
      group: group ?? '默认',
      references: references ?? [],
      date: date ? new Date(date) : undefined,
    },
  });

  logger.info('POST', '创建日记成功', { id: diary.id, title });
  return NextResponse.json({ diary }, { status: 201 });
});
