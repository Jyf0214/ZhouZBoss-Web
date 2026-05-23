import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/diary/draft');

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') ?? 'new';

    const record = await prisma.originiumKV.findUnique({
      where: { key: `diary:draft:${id}` },
    });

    if (!record?.value) {
      return NextResponse.json({ draft: null });
    }

    return NextResponse.json({ draft: JSON.parse(record.value) });
  } catch {
    logger.error('GET', '获取草稿失败');
    return NextResponse.json({ error: '获取草稿失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

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
  } catch {
    logger.error('POST', '保存草稿失败');
    return NextResponse.json({ error: '保存草稿失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'sudo';
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') ?? 'new';

    await prisma.originiumKV.delete({
      where: { key: `diary:draft:${id}` },
    }).catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch {
    logger.error('DELETE', '删除草稿失败');
    return NextResponse.json({ error: '删除草稿失败' }, { status: 500 });
  }
}
