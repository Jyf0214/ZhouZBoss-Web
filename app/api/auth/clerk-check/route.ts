import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';

/**
 * 检查 Clerk 用户是否已绑定 Originium Kernel 账户
 * 如果已绑定，自动创建 JWT session
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
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
        return NextResponse.json({ bound: true, user: { uid: user.uid, email: user.email, name: user.name } });
      }
    }

    return NextResponse.json({ bound: false });
  } catch (error) {
    console.error('Clerk check error:', error);
    return NextResponse.json({ bound: false, error: '检查失败' }, { status: 500 });
  }
}