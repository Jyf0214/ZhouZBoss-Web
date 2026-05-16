import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/auth/clerk-check');

/**
 * 检查 Clerk 用户是否已绑定 Originium Kernel 账户
 * 如果已绑定，自动创建 JWT session
 */
export async function GET() {
  try {
    logger.info('GET', '检查Clerk绑定状态');
    const { userId } = await auth();
    if (!userId) {
      logger.warn('GET', '未登录');
      return NextResponse.json({ bound: false, error: '未登录' }, { status: 401 });
    }

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
        logger.info('GET', 'Clerk账户已绑定，自动登录成功', { uid: user.uid });
        return NextResponse.json({ bound: true, user: { uid: user.uid, email: user.email, name: user.name } });
      }
    }

    logger.info('GET', 'Clerk账户未绑定');
    return NextResponse.json({ bound: false });
  } catch (error) {
    logger.error('GET', '检查Clerk绑定状态失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ bound: false, error: '检查失败' }, { status: 500 });
  }
}