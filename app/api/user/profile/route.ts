import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/user/profile');

export const GET = apiHandler('GET', { label: '获取用户资料', requireAuth: true }, async () => {
  const session = (await getSession())!;
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
});

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

/**
 * 验证并解析请求体，返回验证结果
 */
function validateAndSanitizeInput(body: Record<string, unknown>): {
  avatar: unknown;
  username: unknown;
  name: unknown;
  sanitized: { value: string | null; error?: string };
  error?: string;
  details?: Record<string, unknown>;
} {
  const { avatar, username, name } = body;

  if (areAllUndefined(avatar, username, name)) {
    return { avatar, username, name, sanitized: { value: null }, error: '没有要更新的字段' };
  }

  const sanitized = sanitizeUsername(username);
  if (sanitized.error) {
    return { avatar, username, name, sanitized, error: sanitized.error, details: { username } };
  }

  return { avatar, username, name, sanitized };
}

/**
 * 处理用户名变更：删除旧用户名映射
 */
async function handleUsernameChange(
  db: ReturnType<typeof getDb>,
  user: Record<string, unknown>,
  sanitized: { value: string | null },
): Promise<void> {
  if (user.username && sanitized.value !== null && sanitized.value !== user.username) {
    await db.del(`user:username:${user.username}`);
  }
}

/**
 * 更新用户对象字段并写入数据库
 */
async function updateUserInDb(options: {
  db: ReturnType<typeof getDb>;
  user: Record<string, unknown>;
  sanitized: { value: string | null };
  avatar: unknown;
  name: unknown;
  uid: string;
}): Promise<void> {
  if (options.avatar !== undefined) options.user.avatar = options.avatar;
  if (options.sanitized.value !== null) options.user.username = options.sanitized.value;
  if (options.name !== undefined) options.user.name = options.name;

  await options.db.set(`user:uid:${options.uid}`, JSON.stringify(options.user));

  if (options.sanitized.value) {
    await options.db.set(`user:username:${options.sanitized.value}`, options.uid);
  }
}

export const PUT = apiHandler('PUT', { label: '更新用户资料', requireAuth: true }, async (req) => {
  const session = (await getSession())!;
  const body = await req.json();
  const validation = validateAndSanitizeInput(body);
  if (validation.error) {
    logger.warn('PUT', validation.error, validation.details);
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = getDb();
  const userStr = await db.get(`user:uid:${session.uid}`);
  if (!userStr) {
    logger.warn('PUT', '用户不存在', { uid: session.uid });
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const user = JSON.parse(userStr);

  const conflict = await checkUsernameConflict(db, validation.sanitized.value, user.username);
  if (conflict) {
    logger.warn('PUT', '用户名已被使用', { username: validation.username });
    return NextResponse.json({ error: conflict }, { status: 409 });
  }

  await handleUsernameChange(db, user, validation.sanitized);
  await updateUserInDb({ db, user, sanitized: validation.sanitized, avatar: validation.avatar, name: validation.name, uid: session.uid });

  const configAvatar = await getUserAvatarAsync(session.uid, session.role === 'admin' || session.role === 'sudo');

  logger.info('PUT', '资料更新成功', { uid: session.uid });
  return NextResponse.json({
    success: true,
    user: buildUserResponse(user, configAvatar),
    message: '资料更新成功'
  }, { status: 201 });
});
