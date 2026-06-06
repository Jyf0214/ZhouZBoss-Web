import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { getClerkAuth, isClerkConfigured } from '@/lib/clerk-dynamic';

const logger = createApiLogger('/api/auth/bind-verify');

/**
 * 验证绑定验证码并完成账户绑定
 */
export async function POST(req: NextRequest) {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: 'Clerk 未配置' }, { status: 400 });
  }

  try {
    const authFn = await getClerkAuth();
    if (!authFn) {
      return NextResponse.json({ error: 'Clerk 模块不可用' }, { status: 500 });
    }

    const { userId } = await authFn();
    if (!userId) {
      logger.warn('POST', '未通过 Clerk 登录');
      return NextResponse.json({ error: '请先通过 Clerk 登录' }, { status: 401 });
    }

    const { email, code } = await req.json();
    if (!email || !code) {
      logger.warn('POST', '缺少参数');
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const db = getDb();

    // 验证验证码
    const storedCode = await db.get(`bind:code:${email}`);
    if (!storedCode || storedCode !== code) {
      logger.warn('POST', '验证码错误或已过期', { email });
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
    }

    // 查找用户
    const uid = await db.get(`user:email:${email}`);
    if (!uid) {
      logger.warn('POST', '用户不存在', { email });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取用户信息
    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      logger.error('POST', '用户数据异常', { uid });
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);

    // 检查是否已被其他 Clerk 账户绑定
    const existingBinding = await db.get(`clerk:user:${userId}`);
    if (existingBinding && existingBinding !== uid) {
      logger.warn('POST', 'Clerk 账户已绑定其他用户', { userId });
      return NextResponse.json({ error: '该 Clerk 账户已绑定其他用户' }, { status: 409 });
    }

    // 建立绑定关系（双向）
    await db.set(`clerk:user:${userId}`, uid);
    await db.set(`user:clerk:${uid}`, userId);

    // 更新用户记录的 clerkId（如果使用 Prisma）
    try {
      const { prisma } = await import('@/lib/db');
      await prisma.user.update({
        where: { uid },
        data: {
          clerkId: userId,
          clerkLinkedAt: new Date(),
        },
      });
    } catch {
      // Prisma 更新失败不阻塞（KV 已存储）
    }

    // 删除验证码
    await db.del(`bind:code:${email}`);

    // 创建 JWT session
    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    logger.info('POST', '账户绑定成功', { uid: user.uid, email });
    return NextResponse.json({
      success: true,
      user: { uid: user.uid, email: user.email, name: user.name },
    });
  } catch (error) {
    logger.error('POST', '绑定失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '绑定失败' }, { status: 500 });
  }
}

/**
 * 解绑 Clerk 账户
 */
export async function DELETE() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: 'Clerk 未配置' }, { status: 400 });
  }

  try {
    const authFn = await getClerkAuth();
    if (!authFn) {
      return NextResponse.json({ error: 'Clerk 模块不可用' }, { status: 500 });
    }

    const { userId } = await authFn();
    if (!userId) {
      logger.warn('DELETE', '未通过 Clerk 登录');
      return NextResponse.json({ error: '请先通过 Clerk 登录' }, { status: 401 });
    }

    const db = getDb();

    // 查找绑定关系
    const boundUid = await db.get(`clerk:user:${userId}`);
    if (!boundUid) {
      logger.warn('DELETE', '未绑定任何账户', { userId });
      return NextResponse.json({ error: '未绑定任何账户' }, { status: 404 });
    }

    // 删除绑定关系（双向）
    await db.del(`clerk:user:${userId}`);
    await db.del(`user:clerk:${boundUid}`);

    // 删除 Clerk session
    const { deleteSession } = await import('@/lib/auth');
    await deleteSession();

    logger.info('DELETE', '账户解绑成功', { uid: boundUid });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE', '解绑失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '解绑失败' }, { status: 500 });
  }
}
