import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/requests/[id]');

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    logger.info('PATCH', '处理申请');
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'approve' && action !== 'reject') {
      logger.warn('PATCH', '无效的操作', { action });
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      );
    }

    const requestRecord = await prisma.request.findUnique({
      where: { id }
    });

    if (!requestRecord) {
      logger.warn('PATCH', '申请不存在', { id });
      return NextResponse.json(
        { error: '申请不存在' },
        { status: 404 }
      );
    }

    if (requestRecord.status !== 'pending') {
      logger.warn('PATCH', '申请已处理', { id, status: requestRecord.status });
      return NextResponse.json(
        { error: '申请已处理' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const postPath = join(process.cwd(), 'posts', `${requestRecord.postSlug}.md`);
      try {
        await unlink(postPath);
      } catch (error) {
        logger.error('PATCH', '删除文章失败', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
          { error: '删除文章失败' },
          { status: 500 }
        );
      }
    }

    await prisma.request.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected'
      }
    });

    logger.info('PATCH', '申请处理成功', { id, action });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('PATCH', '处理申请失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: '处理申请失败' },
      { status: 500 }
    );
  }
}
