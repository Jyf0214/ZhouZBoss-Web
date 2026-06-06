import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { getClerkAuth, isClerkConfigured } from '@/lib/clerk-dynamic';

const logger = createApiLogger('/api/auth/clerk-check');

/**
 * 检查 Clerk 用户是否已绑定 Originium Kernel 账户
 * 如果已绑定，自动创建 JWT session
 * Clerk 未配置时返回未登录状态
 */
export async function GET() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ bound: false, error: 'Clerk 未配置' }, { status: 400 });
  }

  try {
    const authFn = await getClerkAuth();
    if (!authFn) {
      return NextResponse.json({ bound: false, error: 'Clerk 模块不可用' }, { status: 500 });
    }

    const { userId } = await authFn();
    if (!userId) {
      logger.warn('GET', '未通过 Clerk 登录');
      return NextResponse.json({ bound: false, error: '未登录' }, { status: 401 });
    }

    logger.info('GET', '检查 Clerk 绑定状态', { userId });
    const db = getDb();

    // 查找绑定关系
    const clerkKey = `clerk:user:${userId}`;
    const boundUid = await db.get(clerkKey);

    if (boundUid) {
      // 已绑定，获取用户信息
      const userStr = await db.get(`user:uid:${boundUid}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        // 创建 JWT session
        await createSession({
          uid: user.uid,
          email: user.email,
          role: user.role as 'user' | 'admin' | 'sudo',
          userGroup: user.userGroup,
        });
        logger.info('GET', 'Clerk 绑定成功，已创建 session', { userId, uid: boundUid });
        return NextResponse.json({ bound: true, user: { uid: user.uid, email: user.email, name: user.name } });
      }
    }

    logger.info('GET', 'Clerk 未绑定', { userId });
    return NextResponse.json({ bound: false });
  } catch (error) {
    logger.error('GET', 'Clerk 检查失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ bound: false, error: '检查失败' }, { status: 500 });
  }
}
