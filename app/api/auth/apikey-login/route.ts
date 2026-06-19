/**
 * API 密钥登录
 * POST /api/auth/apikey-login
 *
 * 请求体: { key: "sk-xxx" }
 * 验证 API 密钥 → 检查 2FA → 创建 Session Cookie → 返回成功
 *
 * 用途:在浏览器中通过 API 密钥登录,替代账号密码
 */
import { type NextRequest, NextResponse } from 'next/server';
import { hashApiKey, createSession, createTempToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';

const logger = createApiLogger('/api/auth/apikey-login');

export async function POST(req: NextRequest) {
  // 频率限制：同一 IP 5 分钟内最多 5 次 API 密钥登录尝试
  const rl = checkRateLimit(req, 'apikey-login', 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    logger.warn('POST', 'API 密钥登录频率超限', { retryAfterMs: rl.retryAfterMs });
    return NextResponse.json(
      { error: `登录尝试过于频繁，请在 ${Math.ceil(rl.retryAfterMs / 1000)} 秒后重试` },
      { status: 429 },
    );
  }

  let body: { key?: string } = {};
  try {
    body = (await req.json()) as { key?: string };
  } catch {
    // 无 body
  }

  const rawKey = (body.key ?? '').trim();
  if (!rawKey) {
    return NextResponse.json({ error: '请输入 API 密钥' }, { status: 400 });
  }

  if (!rawKey.startsWith('sk-')) {
    return NextResponse.json({ error: '无效的 API 密钥格式' }, { status: 400 });
  }

  const db = getDb();
  if (!db.prisma) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
  }

  const hashed = hashApiKey(rawKey);
  const row = await db.prisma.apiKey.findUnique({ where: { key: hashed } });
  if (!row) {
    logger.warn('POST', 'API 密钥无效');
    return NextResponse.json({ error: '密钥无效或已删除' }, { status: 401 });
  }

  // 通过 UID 查用户信息
  const userRaw = await db.get(`user:uid:${row.uid}`);
  if (!userRaw) {
    logger.warn('POST', '关联用户不存在', { uid: row.uid });
    return NextResponse.json({ error: '关联用户不存在' }, { status: 401 });
  }

  const user = JSON.parse(userRaw) as {
    uid: string;
    email: string;
    role: string;
    userGroup?: string;
    twoFactorEnabled?: boolean;
  };

  // 更新最后使用时间(异步,不阻塞响应)
  void db.prisma.apiKey.update({ where: { id: row.id }, data: { lastUsed: new Date() } }).catch(() => { /* best-effort */ });

  // 检查是否启用了 2FA — API 密钥登录不得绕过双因素认证
  if (user.twoFactorEnabled) {
    const tempToken = await createTempToken(user.uid);
    logger.info('POST', '密码验证通过，需要 2FA 验证', { uid: user.uid });
    return NextResponse.json({
      requires2FA: true,
      tempToken,
    });
  }

  // 创建 Session Cookie
  await createSession({
    uid: user.uid,
    email: user.email,
    role: user.role as 'admin' | 'sudo' | 'user',
    userGroup: user.userGroup,
  });

  logger.info('POST', 'API 密钥登录成功', { uid: user.uid });
  return NextResponse.json({
    success: true,
    user: { email: user.email, role: user.role },
  });
}
