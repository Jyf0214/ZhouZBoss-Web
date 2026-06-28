import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler('GET', { label: '获取草稿', requireAdmin: true }, async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const record = await prisma.originiumKV.findUnique({
      where: { key: `diary:draft:${id}` },
    });

    if (!record?.value) {
      return NextResponse.json({ draft: null });
    }

    try {
      return NextResponse.json({ draft: JSON.parse(record.value) });
    } catch {
      return NextResponse.json({ draft: null, error: '草稿数据损坏' });
    }
  }

  const all = await prisma.originiumKV.findMany({
    where: { key: { startsWith: 'diary:draft:' } },
    orderBy: { createdAt: 'desc' },
  });

  const drafts = all.map((r) => {
    try {
      const data = JSON.parse(r.value ?? '{}');
      return {
        id: r.key.replace('diary:draft:', ''),
        title: data.title ?? '',
        content: data.content ?? '',
        tags: data.tags ?? [],
        savedAt: data.savedAt ?? r.createdAt.toISOString(),
      };
    } catch {
      return {
        id: r.key.replace('diary:draft:', ''),
        title: '(损坏)',
        content: '',
        tags: [],
        savedAt: r.createdAt.toISOString(),
      };
    }
  });

  return NextResponse.json({ drafts });
});

export const POST = apiHandler('POST', { label: '保存草稿', requireAdmin: true }, async (req) => {
  const { id, title, content, tags } = await req.json();
  const draftId = id ?? 'new';

  const draftData = JSON.stringify({
    title: title ?? '',
    content: content ?? '',
    tags: tags ?? [],
    savedAt: new Date().toISOString(),
  });

  await prisma.originiumKV.upsert({
    where: { key: `diary:draft:${draftId}` },
    update: { value: draftData },
    create: { key: `diary:draft:${draftId}`, value: draftData },
  });

  return NextResponse.json({ success: true });
});

export const DELETE = apiHandler('DELETE', { label: '删除草稿', requireAdmin: true }, async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? 'new';

  try {
    await prisma.originiumKV.delete({
      where: { key: `diary:draft:${id}` },
    });
  } catch (err) {
    // P2025 = 记录不存在，视为成功；其他错误上报
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      // 记录已不存在，正常
    } else {
      throw err;
    }
  }

  return NextResponse.json({ success: true });
});
