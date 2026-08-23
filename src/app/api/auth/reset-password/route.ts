import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendMail, generateResetEmailHtml, isSmtpConfigured } from '@/lib/mail';
import { randomBytes } from 'crypto';
import { hashPassword } from '@/lib/hash';
import { validatePasswordStrength } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/reset-password');

export async function POST(req: NextRequest) {
  try {
    // 频率限制：同一 IP 10 分钟内最多 3 次重置密码请求
    const rl = checkRateLimit(req, 'reset-password', 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('POST', '密码重置频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: getTranslate('api.auth.requestTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
        { status: 429 },
      );
    }

    const { email } = await req.json();

    if (!email) {
      logger.warn('POST', '缺少邮箱参数');
      return NextResponse.json({ error: getTranslate('api.auth.enterEmail') }, { status: 400 });
    }

    if (!isSmtpConfigured()) {
      logger.error('POST', '邮件服务未配置');
      return NextResponse.json({ error: getTranslate('api.auth.smtpNotConfigured') }, { status: 500 });
    }

    const db = getDb();
    const uid = await db.get(`user:email:${email}`);

    if (!uid) {
      logger.warn('POST', '邮箱未注册', { email: email.includes('@') ? `${email[0]}***@${email.split('@')[1]}` : '***' });
      return NextResponse.json({ success: true, message: getTranslate('api.auth.resetEmailSentIfExists') }, { status: 201 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000;

    await db.set(`reset:${token}`, JSON.stringify({ uid, email, expiresAt }), 3600);

    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: getTranslate('api.auth.appUrlNotConfigured') }, { status: 500 });
    }
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const sent = await sendMail({
      to: email,
      subject: getTranslate('api.auth.resetEmailSubject'),
      html: generateResetEmailHtml(resetLink),
    });

    if (!sent) {
      logger.error('POST', '发送邮件失败', { email });
      return NextResponse.json({ error: getTranslate('api.auth.sendMailFailed') }, { status: 500 });
    }

    logger.info('POST', '重置链接已发送', { email });
    return NextResponse.json({ success: true, message: getTranslate('api.auth.resetLinkSent') }, { status: 201 });
  } catch (error: unknown) {
    logger.error('POST', '密码重置错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.common.serverError') }, { status: 500 });
  }
}

/**
 * 重置前吊销目标用户全部 API 密钥。
 * 返回是否吊销失败——失败必须显式暴露（凭证吊销不完整属安全事件，禁止静默）
 */
async function revokeAllApiKeysWithAudit(
  db: ReturnType<typeof getDb>,
  uid: string,
): Promise<boolean> {
  if (!db.prisma) return false;
  try {
    await db.prisma.apiKey.deleteMany({ where: { uid } });
    logger.info('PUT', '密码重置前已吊销全部 API 密钥', { uid });
    return false;
  } catch (err) {
    logger.error('PUT', '吊销 API 密钥失败', { uid, error: err instanceof Error ? err.message : String(err) });
    void logAudit('password_reset_revocation_failed', 'auth', `密码重置后 API 密钥吊销失败（uid: ${uid}），旧密钥可能仍有效`, uid);
    return true;
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 频率限制：同一 IP 10 分钟内最多 10 次执行重置密码
    const rl = checkRateLimit(req, 'reset-password-exec', 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('PUT', '密码重置执行频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: getTranslate('api.auth.requestTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
        { status: 429 },
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      logger.warn('PUT', '缺少必要参数');
      return NextResponse.json({ error: getTranslate('api.auth.missingParams') }, { status: 400 });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      logger.warn('PUT', '密码复杂度不足', { reasons: strength.reasons });
      return NextResponse.json({ error: getTranslate('api.auth.weakPassword'), reasons: strength.reasons }, { status: 400 });
    }

    const db = getDb();
    const resetData = await db.get(`reset:${token}`);

    if (!resetData) {
      logger.warn('PUT', '无效或过期的重置链接');
      void logAudit('password_reset_failed', 'auth', '密码重置失败：无效或过期的重置链接', 'unknown');
      return NextResponse.json({ error: getTranslate('api.auth.invalidResetLink') }, { status: 400 });
    }

    let resetPayload: { uid: string; expiresAt: number };
    try {
      resetPayload = JSON.parse(resetData);
    } catch {
      logger.warn('PUT', '重置数据损坏', { token });
      await db.del(`reset:${token}`);
      return NextResponse.json({ error: getTranslate('api.auth.resetDataCorrupted') }, { status: 400 });
    }
    const { uid, expiresAt } = resetPayload;

    if (Date.now() > expiresAt) {
      await db.del(`reset:${token}`);
      logger.warn('PUT', '重置链接已过期', { uid });
      void logAudit('password_reset_failed', 'auth', '密码重置失败：重置链接已过期', uid);
      return NextResponse.json({ error: getTranslate('api.auth.resetLinkExpired') }, { status: 400 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      logger.warn('PUT', '用户不存在', { uid });
      return NextResponse.json({ error: getTranslate('api.auth.userNotFound') }, { status: 404 });
    }

    const user = JSON.parse(userStr);

    // 先吊销全部 API 密钥再落库新密码：
    // 若顺序相反且吊销部分失败，泄漏的旧密钥会在"密码已重置"的假象下继续有效；
    // 反向最坏情况是密码未改但密钥被多吊销（可重新登录修复，失败方向安全）
    const revocationFailed = await revokeAllApiKeysWithAudit(db, uid);

    user.password = await hashPassword(password);

    await db.set(`user:uid:${uid}`, JSON.stringify(user));

    // 递增会话版本号，使所有旧 JWT 自动失效
    const currentSv = await db.get(`user:sv:${uid}`);
    const newSv = (currentSv !== null && currentSv !== undefined ? Number(currentSv) : 0) + 1;
    await db.set(`user:sv:${uid}`, String(newSv));

    await db.del(`reset:${token}`);

    logger.info('PUT', '密码重置成功', { uid, revocationFailed });
    void logAudit('password_reset', 'auth', '密码已通过重置链接修改', uid);
    return NextResponse.json(
      {
        success: true,
        message: getTranslate('api.auth.passwordResetSuccess'),
        ...(revocationFailed ? { warning: getTranslate('api.auth.revocationIncomplete') } : {}),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    logger.error('PUT', '密码重置错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.common.serverError') }, { status: 500 });
  }
}
