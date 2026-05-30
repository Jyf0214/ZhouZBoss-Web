import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/users');

/**
 * Users API
 * GET /api/users - List all users (sudo only)
 * GET /api/users/[username] - Get user by username
 */

async function getUserByUsernameSearch(
  db: ReturnType<typeof getDb>,
  username: string,
): Promise<Record<string, unknown> | null> {
  const userListStr = await db.get('users:all:list');
  if (!userListStr) {
    return null;
  }

  const userIds = JSON.parse(userListStr) as string[];

  for (const userId of userIds) {
    const userStr = await db.get(`user:uid:${userId}`);
    if (!userStr) continue;

    const user = JSON.parse(userStr);
    const userUsername = user.email.split('@')[0];
    if (userUsername === username || user.uid === username) {
      return {
        uid: user.uid,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        role: user.role,
        userGroup: user.userGroup,
      };
    }
  }

  return null;
}

async function getUserByUidSearch(
  db: ReturnType<typeof getDb>,
  uid: string,
): Promise<Record<string, unknown> | null> {
  const userStr = await db.get(`user:uid:${uid}`);
  if (!userStr) return null;

  const user = JSON.parse(userStr);
  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    role: user.role,
    userGroup: user.userGroup,
  };
}

async function listAllUsers(
  db: ReturnType<typeof getDb>,
): Promise<Record<string, unknown>[]> {
  const userListStr = await db.get('users:all:list');
  if (!userListStr) return [];

  const userIds = JSON.parse(userListStr) as string[];
  const allUsers: Record<string, unknown>[] = [];

  for (const userId of userIds) {
    const userStr = await db.get(`user:uid:${userId}`);
    if (!userStr) continue;

    const user = JSON.parse(userStr);
    allUsers.push({
      uid: user.uid,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      role: user.role,
      status: user.status,
      userGroup: user.userGroup,
    });
  }

  return allUsers;
}

export const GET = apiHandler('GET', { label: '获取用户列表', requireAuth: true }, async (req) => {
  const session = (await getSession())!;
  logger.info('GET', '获取用户列表');
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const uid = searchParams.get('uid');

  if (username) {
    const userData = await getUserByUsernameSearch(db, username);
    if (!userData) {
      logger.warn('GET', '用户不存在', { username });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(userData);
  }

  if (uid) {
    const userData = await getUserByUidSearch(db, uid);
    if (!userData) {
      logger.warn('GET', '用户不存在', { uid });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(userData);
  }

  if (session.role !== 'sudo' && session.role !== 'admin') {
    logger.warn('GET', '禁止访问', { role: session.role });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allUsers = await listAllUsers(db);
  logger.info('GET', '获取用户列表成功', { count: allUsers.length });
  return NextResponse.json(allUsers);
});
