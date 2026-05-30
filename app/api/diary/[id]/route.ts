import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';
import { encryptContent, decryptContent } from '@/lib/diary-crypto';

const logger = createApiLogger('/api/diary/[id]');

export const GET = apiHandler('GET', { label: '获取日记', requireAdmin: true }, async (req, context) => {
  const id = await getParam(context, 'id');
  const diary = await prisma.diary.findUnique({ where: { id } });
  if (!diary) {
    return NextResponse.json({ error: '日记不存在' }, { status: 404 });
  }

  const decrypted = await decryptContent(diary.content);

  return NextResponse.json({ diary: { ...diary, content: decrypted } });
});

export const PUT = apiHandler('PUT', { label: '更新日记', requireAdmin: true }, async (req, context) => {
  const id = await getParam(context, 'id');
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
});

export const PATCH = apiHandler('PATCH', { label: '切换置顶状态', requireAdmin: true }, async (req, context) => {
  const id = await getParam(context, 'id');
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
});

export const DELETE = apiHandler('DELETE', { label: '删除日记', requireAdmin: true }, async (req, context) => {
  const id = await getParam(context, 'id');
  const existing = await prisma.diary.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: '日记不存在' }, { status: 404 });
  }

  await prisma.diary.delete({ where: { id } });

  logger.info('DELETE', '删除日记成功', { id });
  return NextResponse.json({ success: true });
});
