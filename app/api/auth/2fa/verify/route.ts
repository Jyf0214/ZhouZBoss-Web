import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifyTotp } from '@/lib/totp';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/auth/2fa/verify');

/**
 * POST /api/auth/2fa/verify
 * 验证用户输入的 TOTP 码，确认后正式启用 2FA
 * 前提：必须先调用 /api/auth/2fa/setup 生成密钥
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

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '双因素认证已启用' }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '请先调用 /api/auth/2fa/setup 生成密钥' },
        { status: 400 },
      );
    }

    // 验证 TOTP 码
    const valid = verifyTotp(token, user.twoFactorSecret);
    if (!valid) {
      logger.warn('POST', 'TOTP 验证码错误', { uid: session.uid });
      return NextResponse.json({ error: '验证码错误，请重试' }, { status: 400 });
    }

    // 验证通过，启用 2FA
    user.twoFactorEnabled = true;
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    logger.info('POST', '2FA 已启用', { uid: session.uid });

    return NextResponse.json({
      success: true,
      message: '双因素认证已成功启用',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('POST', '验证 2FA 失败', { message });
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
