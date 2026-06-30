import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * 获取 SMTP 配置
 * 从环境变量读取 SMTP 连接参数
 */
function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '',
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  };
}

/**
 * 检查 SMTP 是否已配置
 * 至少需要 host、user、pass 三个字段
 */
export function isSmtpConfigured(): boolean {
  const config = getSmtpConfig();
  return !!(config.host && config.user && config.pass);
}

/** 缓存的 transporter 单例，避免每次发送邮件都重新创建连接 */
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const config = getSmtpConfig();
  cachedTransporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return cachedTransporter;
}

/**
 * 发送邮件
 * @param options 邮件选项，包含收件人、主题和 HTML 内容
 * @returns 发送是否成功
 */
export async function sendMail(options: MailOptions): Promise<boolean> {
  const config = getSmtpConfig();

  if (!isSmtpConfigured()) {
    console.error('SMTP未配置');
    return false;
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: config.from ?? config.user,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('[mail] 发送邮件失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * 生成密码重置邮件 HTML
 * @param resetLink 重置链接
 * @param appName 应用名称
 */
export function generateResetEmailHtml(resetLink: string, appName = 'Originium Kernel'): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;margin:0;padding:0}
.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden}
.header{background:linear-gradient(135deg,#1a1a1a,#333);padding:40px 32px;text-align:center}
.header h1{color:#fff;font-size:24px;margin:0}
.content{padding:40px 32px}
.content p{color:#666;font-size:16px;line-height:1.6;margin:0 0 24px}
.button{display:inline-block;background:#1a1a1a;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600}
.footer{padding:24px 32px;border-top:1px solid #f0f0f0;text-align:center}
.footer p{color:#999;font-size:14px;margin:0}
</style></head><body>
<div class="container">
<div class="header"><h1>${appName}</h1></div>
<div class="content">
<p>您好，</p>
<p>我们收到了您的密码重置请求。请点击下方按钮重置您的密码：</p>
<p style="text-align:center"><a href="${resetLink}" class="button">重置密码</a></p>
<p>此链接将在 1 小时后失效。如果您没有请求重置密码，请忽略此邮件。</p>
<p style="color:#999;font-size:12px;word-break:break-all">如果按钮无法点击，请复制链接：${resetLink}</p>
</div>
<div class="footer"><p>${appName} © ${new Date().getFullYear()}</p></div>
</div></body></html>`;
}
