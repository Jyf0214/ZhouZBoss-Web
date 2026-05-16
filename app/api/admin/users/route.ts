import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/admin/users');

/**
 * Admin User Management API
 */

export async function GET() {
  const session = await getSession();
  
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('GET', '未授权', { role: session?.role });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    logger.info('GET', '获取用户列表');
    const users = await getAllUsers();
    logger.info('GET', '用户列表获取成功', { count: users.length });
    return NextResponse.json(users);
  } catch (error) {
    logger.error('GET', '获取用户列表失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
