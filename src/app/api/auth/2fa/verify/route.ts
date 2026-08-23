import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifyTotp } from '@/lib/totp';
import { checkRateLimit } from '@/lib/rate-limit';
import { createApiLogger } from '@/lib/api-logger';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/2fa/verify');

/**
 * POST /api/auth/2fa/verify
 * 验证用户输入的 TOTP 码，确认后正式启用 2FA
 * 前提：必须先调用 /api/auth/2fa/setup 生成密钥
 */
export async function POST(req: NextRequest) {
  try {
    // 2FA 属本人数据操作，登录即可（与 setup 同口径）
    const session = await requireAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    const rl = checkRateLimit(req, '2fa-verify', 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: getTranslate('api.auth.verifyTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) }, { status: 429 });
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
    };

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: getTranslate('api.auth.twoFactorEnabled') }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: getTranslate('api.auth.setupTwoFactorFirst') },
        { status: 400 },
      );
    }

    // 验证 TOTP 码
    const valid = verifyTotp(token, user.twoFactorSecret);
    if (!valid) {
      logger.warn('POST', 'TOTP 验证码错误', { uid: session.uid });
      void logAudit('2fa_verify_failed', 'auth', '2FA 启用失败：TOTP 验证码错误', session.uid);
      return NextResponse.json({ error: getTranslate('api.auth.invalidVerificationCode') }, { status: 400 });
    }

    // 验证通过，启用 2FA
    user.twoFactorEnabled = true;
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    logger.info('POST', '2FA 已启用', { uid: session.uid });
    void logAudit('2fa_enabled', 'auth', '2FA 已启用', session.uid);

    return NextResponse.json({
      success: true,
      message: getTranslate('api.auth.twoFactorEnabledSuccess'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '验证 2FA 失败', { message });
    return NextResponse.json({ error: getTranslate('api.auth.verificationFailed') }, { status: 500 });
  }
}
