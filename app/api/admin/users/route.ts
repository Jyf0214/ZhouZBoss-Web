import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/admin/users');

/**
 * Admin User Management API
 */

export const GET = apiHandler('GET', { label: '获取用户列表', requireAdmin: true }, async () => {
  logger.info('GET', '获取用户列表');
  const users = await getAllUsers();
  logger.info('GET', '获取用户列表成功', { count: users.length });
  return NextResponse.json(users);
});
