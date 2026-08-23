import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateTotpSecret, generateTotpUri, generateRecoveryCodes, hashRecoveryCode } from '@/lib/totp';
import { checkRateLimit } from '@/lib/rate-limit';
import { createApiLogger } from '@/lib/api-logger';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/2fa/setup');

/**
 * POST /api/auth/2fa/setup
 * 生成 TOTP 密钥和 otpauth URI，用于前端展示 QR 码
 * 如果用户已启用 2FA，返回错误
 */
export async function POST(req: NextRequest) {
  try {
    // 2FA 属本人数据操作，登录即可（登录链路本就支持全体用户的 2FA，
    // 原 requireAdmin 使普通用户可见可点但永远 403）
    const session = await requireAuth();
    // requireAuth 返回 NextResponse 时表示未认证
    if (session instanceof NextResponse) {
      return session;
    }

    const rl = checkRateLimit(req, '2fa-setup', 3, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: getTranslate('api.common.rateLimited') }, { status: 429 });
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

    if (user.twoFactorEnabled) {
      logger.warn('POST', '2FA 已启用，需先禁用再重新设置', { uid: session.uid });
      void logAudit('2fa_setup_failed', 'auth', '2FA 设置失败：已启用', session.uid);
      return NextResponse.json({ error: getTranslate('api.auth.twoFactorAlreadyEnabled') }, { status: 400 });
    }

    // 生成新的 TOTP 密钥
    const secret = generateTotpSecret();
    const otpauthUri = generateTotpUri(secret, user.email);

    // 生成一次性恢复码：明文仅本次响应返回一次，存储侧只保留哈希
    const recoveryCodes = generateRecoveryCodes();
    const recoveryHashes = recoveryCodes.map(hashRecoveryCode);

    // 将密钥临时存入用户数据（尚未启用，等待 verify 确认）
    user.twoFactorSecret = secret;
    user.twoFactorRecoveryHashes = recoveryHashes;
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    logger.info('POST', 'TOTP 密钥已生成', { uid: session.uid });
    void logAudit('2fa_setup', 'auth', '2FA 设置：TOTP 密钥已生成，等待验证', session.uid);

    return NextResponse.json({
      success: true,
      otpauthUri,
      recoveryCodes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '设置 2FA 失败', { message });
    return NextResponse.json({ error: getTranslate('api.auth.twoFactorSetupFailed') }, { status: 500 });
  }
}
