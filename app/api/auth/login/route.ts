import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession, createTempToken } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { ensureAdminUser } from '@/lib/db-init';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { isLoginLocked, recordLoginFailure, clearLoginAttempts } from '@/lib/login-attempts';

const logger = createApiLogger('/api/auth/login');

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
  // 新格式为 scrypt:<saltHex>:<hashHex>;其他任何格式(64 字符 HMAC-SHA256 hex、
  // 历史 key:hash 形式)都视为旧版,登录成功后立即以 scrypt 重写。
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

export async function POST(req: NextRequest) {
  try {
    // 频率限制：同一 IP 5 分钟内最多 5 次登录尝试
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

    // 登录异常检测：检查是否因连续失败被临时锁定
    if (isLoginLocked(login)) {
      logger.warn('POST', '账号已锁定，连续失败次数过多', { login });
      return NextResponse.json(
        { error: '账号因多次登录失败已临时锁定，请 15 分钟后重试' },
        { status: 429 },
      );
    }

    const db = getDb();

    let uid = await lookupUserByLogin(db, login);

    if (!uid) {
      uid = await tryInitAdminAndReLookup(db, login);
    } else {
      logger.info('POST', '用户已存在，跳过自动初始化', { login });
    }

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
      logger.warn('POST', '账号或密码错误', { login });
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    // 密码验证通过，清除失败计数
    clearLoginAttempts(login);

    await upgradePasswordHashIfNeeded(user, password, db);

    // 检查是否启用了 2FA
    if (user.twoFactorEnabled) {
      const tempToken = await createTempToken(user.uid);
      logger.info('POST', '密码验证通过，需要 2FA 验证', { uid: user.uid });
      return NextResponse.json({
        requires2FA: true,
        tempToken,
      });
    }

    const avatar = await getUserAvatarAsync(user.uid, user.role === 'admin' || user.role === 'sudo');

    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    logger.info('POST', '登录成功', { uid: user.uid });
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
