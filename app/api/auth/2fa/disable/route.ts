import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifyTotp } from '@/lib/totp';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/auth/2fa/disable');

/**
 * POST /api/auth/2fa/disable
 * 验证当前 TOTP 码后禁用 2FA，同时清除密钥
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (session instanceof NextResponse) {
      return session;
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: '请输入验证码' }, { status: 400 });
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

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '双因素认证未启用' }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: '密钥数据异常' }, { status: 500 });
    }

    // 验证当前 TOTP 码（防止未授权禁用）
    const valid = verifyTotp(token, user.twoFactorSecret);
    if (!valid) {
      logger.warn('POST', 'TOTP 验证码错误，禁止禁用 2FA', { uid: session.uid });
      return NextResponse.json({ error: '验证码错误，请重试' }, { status: 400 });
    }

    // 禁用 2FA 并清除密钥
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    logger.info('POST', '2FA 已禁用', { uid: session.uid });

    return NextResponse.json({
      success: true,
      message: '双因素认证已成功禁用',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '禁用 2FA 失败', { message });
    return NextResponse.json({ error: '禁用 2FA 失败' }, { status: 500 });
  }
}
