import { NextResponse, type NextRequest } from 'next/server';
import { createSession, verifyTempToken, clearTempToken, normalizeRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifyTotp, matchRecoveryCode } from '@/lib/totp';
import { getUserAvatarAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { isLoginLocked, recordLoginFailure, clearLoginAttempts } from '@/lib/login-attempts';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/2fa/login');

/** KV 中存储的用户对象结构 */
interface KvUser {
  uid: string;
  email: string;
  username?: string;
  name: string;
  role: string;
  userGroup?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorRecoveryHashes?: string[];
}

/**
 * 解析并验证临时令牌，返回令牌载荷或错误响应
 */
async function resolveTempToken(
  bodyToken: string | undefined,
  cookieToken: string | undefined,
): Promise<{ ok: true; payload: { uid: string } } | { ok: false; error: NextResponse }> {
  const tempToken = bodyToken ?? cookieToken;
  if (!tempToken) {
    return { ok: false, error: NextResponse.json({ error: getTranslate('api.auth.tempTokenMissing') }, { status: 401 }) };
  }
  const payload = await verifyTempToken(tempToken);
  if (!payload) {
    return { ok: false, error: NextResponse.json({ error: getTranslate('api.auth.tempTokenInvalid') }, { status: 401 }) };
  }
  return { ok: true, payload };
}

/**
 * 从 KV 加载用户并校验 2FA 状态
 */
async function loadUserFor2FA(
  uid: string,
): Promise<{ ok: true; user: KvUser } | { ok: false; error: NextResponse }> {
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);
  if (!userStr) {
    logger.warn('POST', '用户数据不存在', { uid });
    return { ok: false, error: NextResponse.json({ error: getTranslate('api.auth.userNotFound') }, { status: 404 }) };
  }
  const user = JSON.parse(userStr) as KvUser;
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return { ok: false, error: NextResponse.json({ error: getTranslate('api.auth.twoFactorNotEnabled') }, { status: 400 }) };
  }
  return { ok: true, user };
}

/**
 * 验证 TOTP 码或一次性恢复码
 * 恢复码命中时从哈希数组移除该码并持久化（一次性消费），
 * 消费落库成功后才会放行登录，避免并发重复使用同一恢复码
 */
async function verifyTokenOrRecovery(
  token: string,
  user: KvUser,
): Promise<{ ok: true; viaRecovery: boolean } | { ok: false; error: NextResponse }> {
  if (verifyTotp(token, user.twoFactorSecret!)) {
    return { ok: true, viaRecovery: false };
  }

  const hashes = user.twoFactorRecoveryHashes ?? [];
  if (hashes.length === 0) {
    logger.warn('POST', 'TOTP 验证码错误', { uid: user.uid });
    return { ok: false, error: NextResponse.json({ error: getTranslate('api.auth.invalidVerificationCode') }, { status: 400 }) };
  }

  const usedHash = matchRecoveryCode(token, hashes);
  if (!usedHash) {
    logger.warn('POST', 'TOTP/恢复码验证均失败', { uid: user.uid });
    return { ok: false, error: NextResponse.json({ error: getTranslate('api.auth.invalidVerificationCode') }, { status: 400 }) };
  }

  const remaining = hashes.filter((h) => h !== usedHash);
  user.twoFactorRecoveryHashes = remaining;
  await getDb().set(`user:uid:${user.uid}`, JSON.stringify(user));
  logger.warn('POST', '使用恢复码登录成功（剩余恢复码数量已减少）', { uid: user.uid, remaining: remaining.length });
  return { ok: true, viaRecovery: true };
}

/**
 * POST /api/auth/2fa/login
 * 验证 TOTP 码后返回正式 JWT session
 * 请求体: { token: string, tempToken?: string }
 * 临时令牌优先从请求体读取，其次从 cookie 读取
 */
export async function POST(req: NextRequest) {
  try {
    // 频率限制：同一 IP 5 分钟内最多 10 次 2FA 验证尝试
    const rl = checkRateLimit(req, '2fa-login', 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('POST', '2FA 验证频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: getTranslate('api.auth.verifyTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { token, tempToken: bodyTempToken } = body as {
      token?: string;
      tempToken?: string;
    };

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: getTranslate('api.auth.enterVerificationCode') }, { status: 400 });
    }

    // 解析临时令牌
    const tokenResult = await resolveTempToken(bodyTempToken, req.cookies.get('temp_2fa')?.value);
    if (!tokenResult.ok) return tokenResult.error;

    // 加载用户并校验 2FA 状态
    const userResult = await loadUserFor2FA(tokenResult.payload.uid);
    if (!userResult.ok) return userResult.error;
    const { user } = userResult;

    // 账号维度锁定检查：IP 限流可被请求头轮换绕过，
    // TOTP 穷举必须由账号级失败计数兜底（与密码登录同一套锁定机制）
    if (await isLoginLocked(user.email)) {
      logger.warn('POST', '2FA 验证账号已锁定', { uid: user.uid });
      return NextResponse.json({ error: getTranslate('api.auth.accountLocked') }, { status: 423 });
    }

    // 验证 TOTP 码；失败时尝试一次性恢复码（验证器丢失的恢复通道）
    const verifyResult = await verifyTokenOrRecovery(token, user);
    if (!verifyResult.ok) {
      await recordLoginFailure(user.email);
      return verifyResult.error;
    }

    // 验证通过，清除临时令牌、失败计数并创建正式 session
    await clearTempToken();
    await clearLoginAttempts(user.email);

    const avatar = await getUserAvatarAsync();

    await createSession({
      uid: user.uid,
      email: user.email,
      role: normalizeRole(user.role),
      userGroup: user.userGroup,
    });

    logger.info('POST', '2FA 登录成功', { uid: user.uid });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: avatar ?? undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '2FA 登录失败', { message });
    return NextResponse.json({ error: getTranslate('api.auth.twoFactorLoginFailed') }, { status: 500 });
  }
}
