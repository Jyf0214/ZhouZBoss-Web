import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifyTotp } from '@/lib/totp';
import { createApiLogger } from '@/lib/api-logger';
import { logAudit } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/2fa/disable');

/**
 * POST /api/auth/2fa/disable
 * 验证当前 TOTP 码后禁用 2FA，同时清除密钥
 */
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, '2fa-disable', 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: getTranslate('api.auth.verifyTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
        { status: 429 },
      );
    }

    // 2FA 属本人数据操作，登录即可（与 setup/verify 同口径；
    // 禁用需验证当前 TOTP 码，不因放宽角色引入风险）
    const session = await requireAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: getTranslate('api.auth.enterVerificationCode') }, { status: 400 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('POST', '用户数据不存在', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.userDataNotFound') }, { status: 404 });
    }

    const user = JSON.parse(userStr) as {
      uid: string;
      email: string;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string;
      twoFactorRecoveryHashes?: string[];
    };

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: getTranslate('api.auth.twoFactorNotEnabled') }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: getTranslate('api.auth.secretDataError') }, { status: 500 });
    }

    // 验证当前 TOTP 码（防止未授权禁用）
    const valid = verifyTotp(token, user.twoFactorSecret);
    if (!valid) {
      logger.warn('POST', 'TOTP 验证码错误，禁止禁用 2FA', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.invalidVerificationCode') }, { status: 400 });
    }

    // 禁用 2FA 并清除密钥与恢复码
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryHashes = undefined;
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    logger.info('POST', '2FA 已禁用', { uid: session.uid });
    void logAudit('2fa_disabled', 'auth', getTranslate('api.auth.twoFactorDisabled'), session.uid);

    return NextResponse.json({
      success: true,
      message: getTranslate('api.auth.twoFactorDisabledSuccess'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '禁用 2FA 失败', { message });
    return NextResponse.json({ error: getTranslate('api.auth.twoFactorDisableFailed') }, { status: 500 });
  }
}
