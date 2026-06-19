import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import nodemailer from 'nodemailer';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';

const logger = createApiLogger('/api/auth/bind-send-code');

/**
 * 发送绑定验证码
 * 验证邮箱是否属于已有的 Originium Kernel 账户
 */
export async function POST(req: NextRequest) {
  try {
    // 频率限制：同一 IP 1 分钟内最多 1 次验证码发送
    const rl = checkRateLimit(req, 'bind-send-code', 1, 60 * 1000);
    if (!rl.allowed) {
      logger.warn('POST', '验证码发送频率超限', { retryAfterMs: rl.retryAfterMs });
      return NextResponse.json(
        { error: `验证码发送过于频繁，请在 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
        { status: 429 },
      );
    }

    const { email } = await req.json();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logger.warn('POST', '无效的邮箱地址');
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    logger.info('POST', '发送绑定验证码', { email });
    const db = getDb();

    // 检查邮箱是否存在
    const uid = await db.get(`user:email:${email}`);
    if (!uid) {
      logger.warn('POST', '邮箱未注册', { email });
      return NextResponse.json({ error: '该邮箱未注册 Originium Kernel 账户' }, { status: 404 });
    }

    // 生成 6 位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 存储验证码（5 分钟有效）
    await db.set(`bind:code:${email}`, code, 300);

    // 尝试发送邮件
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort ?? '587'),
          secure: smtpPort === '465',
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: smtpUser,
          to: email,
          subject: 'Originium Kernel - 账户绑定验证码',
          html: `
            <div style="max-width:480px;margin:0 auto;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
              <h1 style="color:#18181b;font-size:24px;margin-bottom:8px">账户绑定验证</h1>
              <p style="color:#71717a;font-size:14px;margin-bottom:24px">你正在将 Clerk 账户绑定到 Originium Kernel 账户。请输入以下验证码完成绑定：</p>
              <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                <span style="font-size:36px;font-weight:800;letter-spacing:0.3em;color:#18181b;font-family:monospace">${code}</span>
              </div>
              <p style="color:#a1a1aa;font-size:12px">验证码 5 分钟内有效。如非本人操作，请忽略此邮件。</p>
            </div>
          `,
        });
      } catch (mailErr) {
        logger.error('POST', 'SMTP 发送失败', { error: mailErr instanceof Error ? mailErr.message : String(mailErr) });
        const message = mailErr instanceof Error ? mailErr.message : String(mailErr);
        return NextResponse.json({ error: `验证码发送失败: ${message}` }, { status: 500 });
      }
    } else {
      logger.error('POST', '邮件服务未配置');
      return NextResponse.json({ error: '邮件服务未配置，无法发送验证码' }, { status: 500 });
    }

    logger.info('POST', '验证码发送成功', { email });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('POST', '发送验证码失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}