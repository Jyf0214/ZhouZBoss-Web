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

export async function getUserByUsernameSearch(
  db: ReturnType<typeof getDb>,
  username: string,
): Promise<Record<string, unknown> | null> {
  // 使用反向索引 user:username:${username} -> uid,避免 N+1 全表扫描
  const uid = await db.get(`user:username:${username}`);
  if (!uid) return null;
  return getUserByUidSearch(db, uid);
}

async function getUserByUidSearch(
  db: ReturnType<typeof getDb>,
  uid: string,
): Promise<Record<string, unknown> | null> {
  const userStr = await db.get(`user:uid:${uid}`);
  if (!userStr) return null;

  let user: Record<string, unknown>;
  try { user = JSON.parse(userStr); } catch { return null; }
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
  // 优先使用 Prisma 查询用户表（users:all:list 可能未被维护）
  if (db.prisma) {
    try {
      const rows = await db.prisma.user.findMany({
        select: { uid: true, name: true, email: true, createdAt: true, role: true, status: true, userGroup: true },
      });
      return rows.map(r => ({
        uid: r.uid,
        name: r.name,
        email: r.email,
        createdAt: r.createdAt,
        role: r.role,
        status: r.status,
        userGroup: r.userGroup,
      }));
    } catch {
      // Prisma 查询失败，降级到 KV
    }
  }

  // 降级：从 KV 读取用户列表
  const userListStr = await db.get('users:all:list');
  if (!userListStr) return [];

  let userIds: string[];
  try {
    userIds = JSON.parse(userListStr) as string[];
  } catch {
    return [];
  }
  if (!Array.isArray(userIds)) return [];

  // 并行查询所有用户，消除 N+1 串行瓶颈
  const userResults = await Promise.all(
    userIds.map((uid) => db.get(`user:uid:${uid}`)),
  );

  const allUsers: Record<string, unknown>[] = [];
  for (const userStr of userResults) {
    if (!userStr) continue;
    let user: Record<string, unknown>;
    try { user = JSON.parse(userStr); } catch { continue; }
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

  // 用户名/UID 查询同样需要管理员权限，防止任意登录用户探测其他用户信息
  if (username || uid) {
    if (session.role !== 'sudo' && session.role !== 'admin') {
      logger.warn('GET', '禁止查询用户信息', { role: session.role, username, uid });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

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
