/**
 * GET /api/diary/[id]/versions
 * 获取指定日记的版本历史列表（按时间倒序）
 * 需要管理员认证
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getDiaryVersions } from '@/lib/diary-version';

export const GET = apiHandler('GET', { label: '获取日记版本历史', requireAdmin: true }, async (_req, context) => {
  const diaryId = await getParam(context, 'id');

  // 验证日记存在
  const diary = await prisma.diary.findUnique({ where: { id: diaryId }, select: { id: true } });
  if (!diary) {
    return NextResponse.json({ error: '日记不存在' }, { status: 404 });
  }

  const versions = await getDiaryVersions(diaryId);

  return NextResponse.json({ versions });
});
