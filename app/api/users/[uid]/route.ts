import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/users/[uid]');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      logger.warn('GET', '未授权');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await params;
    logger.info('GET', '获取用户信息', { uid });
    const db = getDb();
    const userStr = await db.get(`user:uid:${uid}`);
    
    if (!userStr) {
      logger.warn('GET', '用户不存在', { uid });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    const config = loadConfig();
    const avatar = config.users?.[uid]?.avatar || config.auth?.admin?.avatar || null;

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
  } catch (error) {
    logger.error('GET', '获取用户失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'sudo' && session.role !== 'admin')) {
      logger.warn('PATCH', '无权限', { role: session?.role });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid } = await params;
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
      user.userGroup = userGroup || undefined;
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
  } catch (error) {
    logger.error('PATCH', '更新用户失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
