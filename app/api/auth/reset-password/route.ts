import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendMail, generateResetEmailHtml, isSmtpConfigured } from '@/lib/mail';
import { randomBytes } from 'crypto';
import { hashPassword } from '@/lib/hash';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';

const logger = createApiLogger('/api/auth/reset-password');

export async function POST(req: NextRequest) {
  try {
    // 频率限制：同一 IP 10 分钟内最多 3 次重置密码请求
    const rl = checkRateLimit(req, 'reset-password', 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('POST', '密码重置频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 },
      );
    }

    const { email } = await req.json();

    if (!email) {
      logger.warn('POST', '缺少邮箱参数');
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
    }

    if (!isSmtpConfigured()) {
      logger.error('POST', '邮件服务未配置');
      return NextResponse.json({ error: '邮件服务未配置' }, { status: 500 });
    }

    const db = getDb();
    const uid = await db.get(`user:email:${email}`);

    if (!uid) {
      logger.warn('POST', '邮箱未注册', { email });
      return NextResponse.json({ success: true, message: '如果邮箱存在，重置链接已发送' }, { status: 201 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000;

    await db.set(`reset:${token}`, JSON.stringify({ uid, email, expiresAt }), 3600);

    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: '服务器配置错误：未设置 APP_URL' }, { status: 500 });
    }
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const sent = await sendMail({
      to: email,
      subject: 'Originium Kernel - 密码重置',
      html: generateResetEmailHtml(resetLink),
    });

    if (!sent) {
      logger.error('POST', '发送邮件失败', { email });
      return NextResponse.json({ error: '发送邮件失败' }, { status: 500 });
    }

    logger.info('POST', '重置链接已发送', { email });
    return NextResponse.json({ success: true, message: '重置链接已发送' }, { status: 201 });
  } catch (error: unknown) {
    logger.error('POST', '密码重置错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 频率限制：同一 IP 10 分钟内最多 10 次执行重置密码
    const rl = checkRateLimit(req, 'reset-password-exec', 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      logger.warn('PUT', '密码重置执行频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: `请求过于频繁，请在 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 },
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      logger.warn('PUT', '缺少必要参数');
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (password.length < 6) {
      logger.warn('PUT', '密码长度不足');
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    const db = getDb();
    const resetData = await db.get(`reset:${token}`);

    if (!resetData) {
      logger.warn('PUT', '无效或过期的重置链接');
      return NextResponse.json({ error: '无效或过期的重置链接' }, { status: 400 });
    }

    const { uid, expiresAt } = JSON.parse(resetData);

    if (Date.now() > expiresAt) {
      await db.del(`reset:${token}`);
      logger.warn('PUT', '重置链接已过期', { uid });
      return NextResponse.json({ error: '重置链接已过期' }, { status: 400 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      logger.warn('PUT', '用户不存在', { uid });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    user.password = await hashPassword(password);

    await db.set(`user:uid:${uid}`, JSON.stringify(user));
    await db.del(`reset:${token}`);

    logger.info('PUT', '密码重置成功', { uid });
    return NextResponse.json({ success: true, message: '密码重置成功' }, { status: 201 });
  } catch (error: unknown) {
    logger.error('PUT', '密码重置错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
