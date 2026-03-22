import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateUID, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6个字符' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: '数据库未配置' }, { status: 500 });
    }

    const db = getDb();
    
    // 检查是否是第一个用户
    const userListStr = await db.get('users:all:list');
    const isFirstUser = !userListStr || JSON.parse(userListStr).length === 0;
    
    // 检查邮箱是否已注册
    const existing = await db.get(`user:email:${email}`);
    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
    }

    const uid = generateUID();
    const userRole = isFirstUser ? 'sudo' : 'user';

    // 存储用户数据
    const userPayload = {
      uid, email, name, role: userRole, password,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    await db.set(`user:uid:${uid}`, JSON.stringify(userPayload));
    await db.set(`user:email:${email}`, uid);

    // 更新用户列表
    const userList = userListStr ? JSON.parse(userListStr) : [];
    userList.push(uid);
    await db.set('users:all:list', JSON.stringify(userList));

    await createSession({ uid, email, role: userRole });

    return NextResponse.json({
      success: true,
      user: { uid, email, name, role: userRole },
      message: isFirstUser ? '注册成功！您是首个用户，已获得管理员权限。' : '注册成功！'
    });
  } catch (error: any) {
    console.error(JSON.stringify({ type: 'register_error', message: error.message, stack: error.stack }));
    return NextResponse.json({ error: error.message || '注册失败' }, { status: 500 });
  }
}
