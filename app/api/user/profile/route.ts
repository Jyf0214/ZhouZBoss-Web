import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/user/profile');

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      logger.warn('GET', '未登录');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('GET', '用户不存在', { uid: session.uid });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    const configAvatar = await getUserAvatarAsync(session.uid, session.role === 'admin' || session.role === 'sudo');

    logger.info('GET', '获取用户资料成功', { uid: session.uid });
    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: user.avatar ?? configAvatar ?? undefined,
        role: user.role,
        userGroup: user.userGroup,
        createdAt: user.createdAt,
        status: user.status,
      }
    });
  } catch (error: unknown) {
    logger.error('GET', '获取用户资料失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '获取用户资料失败' }, { status: 500 });
  }
}

/**
 * 检查所有指定字段是否均为 undefined
 */
function areAllUndefined(...args: unknown[]): boolean {
  return args.every((a) => a === undefined);
}

/**
 * 验证并清理用户名
 * 返回 { value: string | null, error?: string }
 */
function sanitizeUsername(username: unknown): { value: string | null; error?: string } {
  if (username === undefined || username === null) return { value: null };
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { value: null, error: '用户名只能包含字母、数字和下划线，3-20个字符' };
  }
  return { value: username };
}

/**
 * 检查用户名是否已被其他用户使用
 */
async function checkUsernameConflict(
  db: ReturnType<typeof getDb>,
  newUsername: string | null,
  currentUsername: string | undefined | null,
): Promise<string | null> {
  if (newUsername === null || newUsername === currentUsername) return null;
  const existing = await db.get(`user:username:${newUsername}`);
  return existing ? '该用户名已被使用' : null;
}

/**
 * 构建用户响应对象
 */
function buildUserResponse(
  user: Record<string, unknown>,
  configAvatar: string | null | undefined,
): Record<string, unknown> {
  const avatar = user.avatar ?? configAvatar ?? undefined;
  return {
    uid: user.uid,
    email: user.email,
    username: user.username,
    name: user.name,
    avatar,
    role: user.role,
    userGroup: user.userGroup,
  };
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      logger.warn('PUT', '未登录');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await req.json();
    const { avatar, username, name } = body;

    if (areAllUndefined(avatar, username, name)) {
      logger.warn('PUT', '没有要更新的字段');
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    const sanitized = sanitizeUsername(username);
    if (sanitized.error) {
      logger.warn('PUT', '用户名格式无效', { username });
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('PUT', '用户不存在', { uid: session.uid });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);

    const conflict = await checkUsernameConflict(db, sanitized.value, user.username);
    if (conflict) {
      logger.warn('PUT', '用户名已被使用', { username });
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    if (user.username && sanitized.value !== null && sanitized.value !== user.username) {
      await db.del(`user:username:${user.username}`);
    }

    if (avatar !== undefined) user.avatar = avatar;
    if (sanitized.value !== null) user.username = sanitized.value;
    if (name !== undefined) user.name = name;

    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    if (sanitized.value) {
      await db.set(`user:username:${sanitized.value}`, session.uid);
    }

    const configAvatar = await getUserAvatarAsync(session.uid, session.role === 'admin' || session.role === 'sudo');

    logger.info('PUT', '资料更新成功', { uid: session.uid });
    return NextResponse.json({
      success: true,
      user: buildUserResponse(user, configAvatar),
      message: '资料更新成功'
    }, { status: 201 });
  } catch (error: unknown) {
    logger.error('PUT', '更新用户资料失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '更新用户资料失败' }, { status: 500 });
  }
}
