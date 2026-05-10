import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { verifyPassword, verifyLegacyPassword, hashPassword } from '@/lib/hash';
import { ensureAdminUser } from '@/lib/db-init';

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ error: '缺少登录信息或密码' }, { status: 400 });
    }

    const db = getDb();
    console.warn('[登录] 登录尝试:', { login, hasPassword: !!password, passwordLength: password?.length });
    console.warn('[登录] 原始密码值:', password);
    console.warn('[登录] ADMIN_PASSWORD 环境变量:', process.env.ADMIN_PASSWORD ? '已设置(长度:' + process.env.ADMIN_PASSWORD.length + ')' : '未设置');
    console.warn('[登录] ADMIN_PASSWORD 值:', process.env.ADMIN_PASSWORD);
    
    // 支持邮箱或用户名登录
    let uid: string | null = null;
    
    // 先尝试作为邮箱查找
    if (login.includes('@')) {
      uid = await db.get(`user:email:${login}`);
      console.warn('[登录] 邮箱查找:', { login, uid });
    }
    
    // 如果没找到，尝试作为用户名查找
    if (!uid) {
      uid = await db.get(`user:username:${login}`);
      console.warn('[登录] 用户名查找:', { login, uid });
    }

    if (!uid) {
      const initResult = await ensureAdminUser();
      if (initResult.error) {
        return NextResponse.json({ error: initResult.error }, { status: 503 });
      }
      if (initResult.created) {
        if (login.includes('@')) {
          uid = await db.get(`user:email:${login}`);
        }
        if (!uid) {
          uid = await db.get(`user:username:${login}`);
        }
      }
    } else {
      console.warn('[登录] 用户已存在，跳过自动初始化');
    }

    if (!uid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);
    console.warn('[登录] 用户找到:', { uid: user.uid, email: user.email, hasPassword: !!user.password, isNewHash: user.password.includes(':') });
    
    const isNewHash = user.password.includes(':');
    const passwordMatch = isNewHash
      ? await verifyPassword(password, user.password)
      : verifyLegacyPassword(password, user.password);
    
    console.warn('[登录] 密码验证结果:', { passwordMatch, isNewHash });
    console.warn('[登录] 数据库存储的哈希:', user.password);
    console.warn('[登录] 输入密码:', password, '长度:', password?.length);

  if (!passwordMatch) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
  }

  if (!isNewHash) {
    try {
      user.password = await hashPassword(password);
      await db.set(`user:uid:${user.uid}`, JSON.stringify(user));
    } catch {
      console.error('密码哈希升级失败:', user.uid);
    }
  }

    const avatar = await getUserAvatarAsync(user.uid);

    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: avatar || undefined
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ type: 'login_error', message }));
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
