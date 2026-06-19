import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';

const logger = createApiLogger('/api/users/[uid]');

export const GET = apiHandler('GET', { label: '获取用户信息', requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('GET', '获取用户信息', { uid });
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('GET', '用户不存在', { uid });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = JSON.parse(userStr);
  const config = loadConfig();
  const avatar = config.users?.[uid]?.avatar ?? config.auth?.admin?.avatar ?? null;

  logger.info('GET', '获取用户信息成功', { uid });
  return NextResponse.json({
    uid: user.uid,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    role: user.role,
    userGroup: user.userGroup,
    status: user.status,
    avatar,
  });
});

export const PATCH = apiHandler('PATCH', { label: '更新用户信息', requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('PATCH', '更新用户信息', { uid });
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('PATCH', '用户不存在', { uid });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = JSON.parse(userStr);
  const body = await req.json();
  const { role, userGroup } = body;

  if (role !== undefined) {
    const validRoles: UserRole[] = ['user', 'admin', 'sudo'];
    if (!validRoles.includes(role)) {
      logger.warn('PATCH', '无效角色', { role });
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    user.role = role;
  }

  if (userGroup !== undefined) {
    user.userGroup = userGroup ?? undefined;
  }

  await db.set(`user:uid:${uid}`, JSON.stringify(user));
  logger.info('PATCH', '用户更新成功', { uid });
  return NextResponse.json({
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: user.role,
    userGroup: user.userGroup,
    status: user.status,
  });
});
