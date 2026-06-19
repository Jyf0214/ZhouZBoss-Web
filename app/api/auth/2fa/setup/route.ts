import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateTotpSecret, generateTotpUri } from '@/lib/totp';
import { createApiLogger } from '@/lib/api-logger';
import { logAudit } from '@/lib/audit';

const logger = createApiLogger('/api/auth/2fa/setup');

/**
 * POST /api/auth/2fa/setup
 * 生成 TOTP 密钥和 otpauth URI，用于前端展示 QR 码
 * 如果用户已启用 2FA，返回错误
 */
export async function POST() {
  try {
    const session = await requireAdmin();
    // requireAdmin 返回 NextResponse 时表示未认证
    if (session instanceof NextResponse) {
      return session;
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('POST', '用户数据不存在', { uid: session.uid });
      return NextResponse.json({ error: '用户数据不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr) as {
      uid: string;
      email: string;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string;
    };

    if (user.twoFactorEnabled) {
      logger.warn('POST', '2FA 已启用，需先禁用再重新设置', { uid: session.uid });
      return NextResponse.json({ error: '双因素认证已启用，请先禁用后再重新设置' }, { status: 400 });
    }

    // 生成新的 TOTP 密钥
    const secret = generateTotpSecret();
    const otpauthUri = generateTotpUri(secret, user.email);

    // 将密钥临时存入用户数据（尚未启用，等待 verify 确认）
    user.twoFactorSecret = secret;
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    logger.info('POST', 'TOTP 密钥已生成', { uid: session.uid });
    void logAudit('2fa_enabled', 'auth', '双因素认证已启用', session.uid);

    return NextResponse.json({
      success: true,
      secret,
      otpauthUri,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '设置 2FA 失败', { message });
    return NextResponse.json({ error: '设置 2FA 失败' }, { status: 500 });
  }
}
