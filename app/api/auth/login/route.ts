import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: '缺少邮箱或密码' }, { status: 400 });
    }

    const db = getDb();
    
    const uid = await db.get(`user:email:${email}`);
    if (!uid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);
    const hashedPassword = Buffer.from(password).toString('hex').split('').reverse().join('');
    if (user.password !== hashedPassword) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    return NextResponse.json({ success: true, user: { uid: user.uid, email: user.email, name: user.name, role: user.role } });
  } catch (error: any) {
    console.error(JSON.stringify({ type: 'login_error', message: error.message, stack: error.stack }));
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
