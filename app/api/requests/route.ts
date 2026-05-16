import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/requests');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    logger.info('GET', '获取申请列表', { status });
    const requests = await prisma.request.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' }
    });

    logger.info('GET', '获取申请列表成功', { count: requests.length });
    return NextResponse.json({ requests });
  } catch (error) {
    logger.error('GET', '获取申请列表失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: '获取申请列表失败' },
      { status: 500 }
    );
  }
}
