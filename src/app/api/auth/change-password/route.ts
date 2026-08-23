import { NextResponse } from 'next/server';
import { getSession, hashApiKey, validatePasswordStrength, createSession } from '@/lib/auth';
import { getDb, type IDatabase } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/change-password');

/**
 * 吊销用户除当前认证来源外的 API 密钥
 * 返回 { revoked, failed }：吊销失败必须显式暴露（凭证吊销不完整属安全事件，禁止静默）
 */
async function revokeOtherApiKeys(db: IDatabase, uid: string): Promise<{ revoked: number; failed: boolean }> {
  if (!db.prisma) return { revoked: 0, failed: false };
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
        return { revoked: result.count, failed: false };
      }
    }
    // Cookie 认证或 API 密钥未找到：吊销全部
    const result = await db.prisma.apiKey.deleteMany({ where: { uid } });
    return { revoked: result.count, failed: false };
  } catch (err) {
    logger.error('POST', '吊销 API 密钥失败', { uid, error: err instanceof Error ? err.message : String(err) });
    void logAudit('password_change_revocation_failed', 'auth', `密码修改后 API 密钥吊销失败（uid: ${uid}），旧密钥可能仍有效`, uid);
    return { revoked: 0, failed: true };
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
        { error: getTranslate('api.auth.requestTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
        { status: 429 },
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: getTranslate('api.common.notLoggedIn') }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      logger.warn('POST', '缺少必要参数', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.requireCurrentAndNewPassword') }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      logger.warn('POST', '新密码复杂度不足', { uid: session.uid, reasons: strength.reasons });
      return NextResponse.json({ error: getTranslate('api.auth.weakNewPassword'), reasons: strength.reasons }, { status: 400 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('POST', '用户不存在', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.userNotFound') }, { status: 404 });
    }
    const user = JSON.parse(userStr) as Record<string, unknown>;
    if (typeof user.password !== 'string') {
      logger.warn('POST', '用户密码数据异常', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.passwordDataCorrupted') }, { status: 500 });
    }

    if (!(await verifyPassword(currentPassword, user.password))) {
      logger.warn('POST', '当前密码错误', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.currentPasswordWrong') }, { status: 401 });
    }

    if (await verifyPassword(newPassword, user.password)) {
      logger.warn('POST', '新密码与当前密码相同', { uid: session.uid });
      return NextResponse.json({ error: getTranslate('api.auth.samePassword') }, { status: 400 });
    }

    // 先吊销其他 API 密钥再更新密码与会话版本：
    // 若顺序相反且吊销失败，攻击者持有的旧密钥会在"密码已改"的假象下继续有效；
    // 反向最坏情况是密码未改但密钥被多吊销（可重新登录修复，失败方向安全）
    const revocation = await revokeOtherApiKeys(db, session.uid);

    user.password = await hashPassword(newPassword);
    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    // 递增会话版本号，使所有旧 JWT 自动失效
    const currentSv = await db.get(`user:sv:${session.uid}`);
    const newSv = (currentSv !== null && currentSv !== undefined ? Number(currentSv) : 0) + 1;
    await db.set(`user:sv:${session.uid}`, String(newSv));

    // 刷新当前会话 cookie，使新 sv 立即生效，避免用户被登出
    await createSession({
      uid: session.uid,
      email: session.email,
      role: session.role,
      userGroup: session.userGroup,
    });

    if (revocation.revoked > 0) {
      logger.info('POST', '已吊销其他 API 密钥', { uid: session.uid, count: revocation.revoked });
    }

    logger.info('POST', '密码修改成功', { uid: session.uid, revokedKeys: revocation.revoked, revocationFailed: revocation.failed });
    void logAudit('password_change', 'auth', getTranslate('api.auth.changePasswordSuccess'), session.uid);
    return NextResponse.json({
      success: true,
      message: getTranslate('api.auth.changePasswordSuccess'),
      revokedSessions: revocation.revoked,
      ...(revocation.failed ? { warning: getTranslate('api.auth.revocationIncomplete') } : {}),
    });
  },
);
