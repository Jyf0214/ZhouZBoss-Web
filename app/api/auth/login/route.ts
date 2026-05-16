import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { ensureAdminUser } from '@/lib/db-init';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/auth/login');

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      logger.warn('POST', '缺少登录信息或密码');
      return NextResponse.json({ error: '缺少登录信息或密码' }, { status: 400 });
    }

    const db = getDb();
    
    let uid: string | null = null;
    
    if (login.includes('@')) {
      uid = await db.get(`user:email:${login}`);
    }
    
    if (!uid) {
      uid = await db.get(`user:username:${login}`);
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
      logger.info('POST', '用户已存在，跳过自动初始化', { login });
    }

    if (!uid) {
      logger.warn('POST', '账号或密码错误', { login });
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      logger.error('POST', '用户数据异常', { uid });
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);
    const isNewHash = user.password.length === 64 && /^[a-f0-9]+$/.test(user.password);
    const passwordMatch = await verifyPassword(password, user.password);
    
    if (!passwordMatch) {
      logger.warn('POST', '账号或密码错误', { login });
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    if (!isNewHash) {
      try {
        user.password = await hashPassword(password);
        await db.set(`user:uid:${user.uid}`, JSON.stringify(user));
      } catch {
        logger.warn('POST', '密码哈希升级失败', { uid: user.uid });
      }
    }

    const avatar = await getUserAvatarAsync(user.uid, user.role === 'admin' || user.role === 'sudo');

    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    logger.info('POST', '登录成功', { uid: user.uid });
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
    logger.error('POST', '登录失败', { message });
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
