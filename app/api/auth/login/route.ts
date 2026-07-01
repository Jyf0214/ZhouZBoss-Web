import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession, createTempToken, type SessionPayload } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { ensureAdminUser } from '@/lib/db-init';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { isLoginLocked, recordLoginFailure, clearLoginAttempts } from '@/lib/login-attempts';
import { logAudit } from '@/lib/audit';

const logger = createApiLogger('/api/auth/login');

/** 预检登录请求：频率限制、参数完整性、账号锁定检查 */
async function validateLoginRequest(
  req: NextRequest,
): Promise<{ login: string; password: string } | NextResponse> {
  const rl = checkRateLimit(req, 'login', 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    logger.warn('POST', '登录频率超限', { retryAfterMs: rl.retryAfterMs });
    return NextResponse.json(
      { error: `登录尝试过于频繁，请在 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
      { status: 429 },
    );
  }

  const { login, password } = await req.json();
  if (!login || !password) {
    logger.warn('POST', '缺少登录信息或密码');
    return NextResponse.json({ error: '缺少登录信息或密码' }, { status: 400 });
  }

  if (isLoginLocked(login)) {
    logger.warn('POST', '账号已锁定，连续失败次数过多', { login });
    return NextResponse.json(
      { error: '账号因多次登录失败已临时锁定，请 15 分钟后重试' },
      { status: 429 },
    );
  }

  return { login, password };
}

async function lookupUserByLogin(
  db: ReturnType<typeof getDb>,
  login: string,
): Promise<string | null> {
  if (login.includes('@')) {
    const uid = await db.get(`user:email:${login}`);
    if (uid) return uid;
  }
  return db.get(`user:username:${login}`);
}

async function tryInitAdminAndReLookup(
  db: ReturnType<typeof getDb>,
  login: string,
): Promise<string | null> {
  const initResult = await ensureAdminUser();
  if (initResult.error || !initResult.created) {
    return null;
  }
  if (login.includes('@')) {
    const uid = await db.get(`user:email:${login}`);
    if (uid) return uid;
  }
  return db.get(`user:username:${login}`);
}

async function upgradePasswordHashIfNeeded(
  user: { uid: string; password: string },
  password: string,
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const isScryptFormat = user.password.startsWith('scrypt:') && user.password.split(':').length === 3;
  if (!isScryptFormat) {
    try {
      user.password = await hashPassword(password);
      await db.set(`user:uid:${user.uid}`, JSON.stringify(user));
    } catch {
      logger.warn('POST', '密码哈希升级失败', { uid: user.uid });
    }
  }
}

/** 查找用户 UID（含首次访问时自动初始化管理员） */
async function resolveUserUid(
  db: ReturnType<typeof getDb>,
  login: string,
): Promise<string | null> {
  const uid = await lookupUserByLogin(db, login);
  if (uid) {
    logger.info('POST', '用户已存在，跳过自动初始化', { login });
    return uid;
  }
  return tryInitAdminAndReLookup(db, login);
}

export async function POST(req: NextRequest) {
  try {
    // 预检：频率限制、参数完整性、账号锁定
    const validation = await validateLoginRequest(req);
    if (validation instanceof NextResponse) return validation;
    const { login, password } = validation;

    const db = getDb();

    const uid = await resolveUserUid(db, login);
    if (!uid) {
      logger.warn('POST', '账号或密码错误', { login });
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      logger.error('POST', '用户数据异常', { uid });
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);
    const passwordMatch = await verifyPassword(password, user.password);

    if (!passwordMatch) {
      recordLoginFailure(login);
      void logAudit('login_failed', 'auth', '登录失败', login);
      logger.warn('POST', '账号或密码错误', { login });
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    clearLoginAttempts(login);
    await upgradePasswordHashIfNeeded(user, password, db);

    if (user.twoFactorEnabled) {
      await createTempToken(user.uid);
      logger.info('POST', '密码验证通过，需要 2FA 验证', { uid: user.uid });
      return NextResponse.json({ requires2FA: true });
    }

    const avatar = await getUserAvatarAsync(user.uid, user.role === 'admin' || user.role === 'sudo', user.email);

    const validRoles = ['user', 'admin', 'sudo'] as const;
    const role = validRoles.includes(user.role as 'user' | 'admin' | 'sudo') ? user.role as SessionPayload['role'] : 'user';

    await createSession({
      uid: user.uid,
      email: user.email,
      role,
      userGroup: user.userGroup,
    });

    logger.info('POST', '登录成功', { uid: user.uid });
    void logAudit('login', 'auth', '登录成功', user.uid);
    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: avatar ?? undefined
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '登录失败', { message });
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
