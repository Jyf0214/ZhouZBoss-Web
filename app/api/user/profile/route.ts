import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { rateLimit } from '@/lib/rate-limit';

const logger = createApiLogger('/api/user/profile');

export const GET = apiHandler('GET', { label: '获取用户资料', requireAuth: true }, async () => {
  const session = (await getSession())!;
  const db = getDb();
  const userStr = await db.get(`user:uid:${session.uid}`);
  if (!userStr) {
    logger.warn('GET', '用户不存在', { uid: session.uid });
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userStr);
  } catch {
    return NextResponse.json({ error: '用户数据损坏' }, { status: 500 });
  }
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

/** 验证头像 URL：仅允许 http(s)、data:image/、相对路径，最大 2000 字符 */
function sanitizeAvatarUrl(url: unknown): string | undefined {
  if (typeof url !== 'string' || url.trim().length === 0) return undefined;
  const trimmed = url.trim();
  if (trimmed.length > 2000) return undefined;
  if (/^(https?:\/\/|data:image\/|\/)/.test(trimmed)) return trimmed;
  return undefined;
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

  // avatar 和 name 必须是字符串
  if (avatar !== undefined && typeof avatar !== 'string') {
    return { avatar, username, name, sanitized: { value: null }, error: 'avatar 必须是字符串' };
  }
  if (name !== undefined && typeof name !== 'string') {
    return { avatar, username, name, sanitized: { value: null }, error: 'name 必须是字符串' };
  }

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
  if (options.avatar !== undefined) options.user.avatar = sanitizeAvatarUrl(options.avatar);
  if (options.sanitized.value !== null) options.user.username = options.sanitized.value;
  if (options.name !== undefined && typeof options.name === 'string') {
    const trimmed = options.name.trim();
    if (trimmed.length > 0 && trimmed.length <= 50) {
      options.user.name = trimmed;
    }
  }

  await options.db.set(`user:uid:${options.uid}`, JSON.stringify(options.user));

  if (options.sanitized.value) {
    await options.db.set(`user:username:${options.sanitized.value}`, options.uid);
  }
}

export const PUT = apiHandler('PUT', { label: '更新用户资料', requireAuth: true }, async (req) => {
  const session = (await getSession())!;

  const rl = rateLimit(`${session.uid}:profile-write`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: '操作过于频繁' }, { status: 429 });
  }

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

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userStr);
  } catch {
    return NextResponse.json({ error: '用户数据损坏' }, { status: 500 });
  }

  const conflict = await checkUsernameConflict(db, validation.sanitized.value, user.username as string | undefined);
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
