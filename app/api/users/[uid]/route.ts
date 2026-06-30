import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';

const logger = createApiLogger('/api/users/[uid]');

/** 校验角色变更权限，返回 null 表示通过，否则返回错误 Response */
async function validateRoleChange(
  role: UserRole,
  targetUser: Record<string, unknown>,
  uid: string,
): Promise<NextResponse | null> {
  const validRoles: UserRole[] = ['user', 'admin', 'sudo'];
  if (!validRoles.includes(role)) {
    logger.warn('PATCH', '无效角色', { role });
    return NextResponse.json({ error: '无效的角色' }, { status: 400 });
  }
  const currentSession = await getSession();
  if (currentSession && currentSession.role !== 'sudo') {
    if (role === 'admin' || role === 'sudo') {
      logger.warn('PATCH', '权限不足：admin 不能将用户提升为 admin 或 sudo', { uid, requestedRole: role });
      return NextResponse.json({ error: '仅超级管理员可以设置管理员或超级管理员角色' }, { status: 403 });
    }
    if (targetUser.role === 'sudo') {
      logger.warn('PATCH', '权限不足：admin 不能降级超级管理员', { uid });
      return NextResponse.json({ error: '仅超级管理员可以修改超级管理员角色' }, { status: 403 });
    }
  }
  return null;
}

export const GET = apiHandler('GET', { label: '获取用户信息', requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('GET', '获取用户信息', { uid });
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('GET', '用户不存在', { uid });
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userStr);
  } catch {
    return NextResponse.json({ error: '用户数据损坏' }, { status: 500 });
  }
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
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userStr);
  } catch {
    return NextResponse.json({ error: '用户数据损坏' }, { status: 500 });
  }
  const body = await req.json();
  const { role, userGroup } = body;
  const previousRole = user.role as string | undefined;

  if (role !== undefined) {
    const roleErr = await validateRoleChange(role, user, uid);
    if (roleErr) return roleErr;
    user.role = role;
  }

  if (userGroup !== undefined) {
    user.userGroup = userGroup ?? undefined;
  }

  await db.set(`user:uid:${uid}`, JSON.stringify(user));

  // 角色变更时递增会话版本号，使旧 JWT 失效
  if (role !== undefined && role !== previousRole) {
    const currentSv = await db.get(`user:sv:${uid}`);
    const newSv = (currentSv !== null && currentSv !== undefined ? Number(currentSv) : 0) + 1;
    await db.set(`user:sv:${uid}`, String(newSv));
  }

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
