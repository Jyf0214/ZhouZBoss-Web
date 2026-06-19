import { NextResponse } from 'next/server';
import { getSession, hashApiKey, validatePasswordStrength } from '@/lib/auth';
import { getDb, type IDatabase } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { logAudit } from '@/lib/audit';

const logger = createApiLogger('/api/auth/change-password');

/**
 * 吊销用户除当前认证来源外的 API 密钥
 * 返回吊销数量；出错时静默返回 0（非致命）
 */
async function revokeOtherApiKeys(db: IDatabase, uid: string): Promise<number> {
  if (!db.prisma) return 0;
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get('authorization') ?? '';
    const isApiKeyAuth = authHeader.startsWith('Bearer ') && authHeader.slice(7).trim().startsWith('sk-');

    if (isApiKeyAuth) {
      const hashed = hashApiKey(authHeader.slice(7).trim());
      const currentKey = await db.prisma.apiKey.findUnique({ where: { key: hashed } });
      if (currentKey) {
        const result = await db.prisma.apiKey.deleteMany({
          where: { uid, id: { not: currentKey.id } },
        });
        return result.count;
      }
    }
    // Cookie 认证或 API 密钥未找到：吊销全部
    const result = await db.prisma.apiKey.deleteMany({ where: { uid } });
    return result.count;
  } catch {
    logger.warn('POST', '吊销 API 密钥失败（非致命）', { uid });
    return 0;
  }
}

/**
 * 已登录用户修改密码
 *
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 */
export const POST = apiHandler(
  'POST',
  { label: 'change-password', requireAuth: true },
  async (req) => {
    const rl = checkRateLimit(req, 'change-password', 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('POST', '修改密码频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      logger.warn('POST', '缺少必要参数', { uid: session.uid });
      return NextResponse.json({ error: '请输入当前密码和新密码' }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      logger.warn('POST', '新密码复杂度不足', { uid: session.uid, reasons: strength.reasons });
      return NextResponse.json({ error: '新密码不符合安全要求', reasons: strength.reasons }, { status: 400 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('POST', '用户不存在', { uid: session.uid });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    const user = JSON.parse(userStr) as { password: string };

    if (!(await verifyPassword(currentPassword, user.password))) {
      logger.warn('POST', '当前密码错误', { uid: session.uid });
      return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
    }

    if (await verifyPassword(newPassword, user.password)) {
      logger.warn('POST', '新密码与当前密码相同', { uid: session.uid });
      return NextResponse.json({ error: '新密码不能与当前密码相同' }, { status: 400 });
    }

    user.password = await hashPassword(newPassword);
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    const revokedCount = await revokeOtherApiKeys(db, session.uid);
    if (revokedCount > 0) {
      logger.info('POST', '已吊销其他 API 密钥', { uid: session.uid, count: revokedCount });
    }

    logger.info('POST', '密码修改成功', { uid: session.uid, revokedKeys: revokedCount });
    void logAudit('password_change', 'auth', '密码已修改', session.uid);
    return NextResponse.json({
      success: true,
      message: '密码修改成功',
      revokedSessions: revokedCount,
    });
  },
);
