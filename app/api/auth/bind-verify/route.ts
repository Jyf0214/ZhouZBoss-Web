import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';

/**
 * 验证绑定验证码并完成账户绑定
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '请先通过 Clerk 登录' }, { status: 401 });
    }

    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const db = getDb();

    // 验证验证码
    const storedCode = await db.get(`bind:code:${email}`);
    if (!storedCode || storedCode !== code) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
    }

    // 查找用户
    const uid = await db.get(`user:email:${email}`);
    if (!uid) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取用户信息
    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);

    // 检查是否已被其他 Clerk 账户绑定
    const existingBinding = await db.get(`clerk:user:${userId}`);
    if (existingBinding && existingBinding !== uid) {
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

    return NextResponse.json({
      success: true,
      user: { uid: user.uid, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Bind verify error:', error);
    return NextResponse.json({ error: '绑定失败' }, { status: 500 });
  }
}