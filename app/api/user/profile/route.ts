import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/user/profile');

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      logger.warn('GET', '未登录');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('GET', '用户不存在', { uid: session.uid });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    const avatar = await getUserAvatarAsync(session.uid, session.role === 'admin' || session.role === 'sudo');

    logger.info('GET', '获取用户资料成功', { uid: session.uid });
    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: avatar || undefined,
        role: user.role,
        userGroup: user.userGroup,
        createdAt: user.createdAt,
        status: user.status,
      }
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('GET', '获取用户资料失败', { error: error.message });
    return NextResponse.json({ error: '获取用户资料失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      logger.warn('PUT', '未登录');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await req.json();
    const { avatar, username, name } = body;

    if (avatar === undefined && username === undefined && name === undefined) {
      logger.warn('PUT', '没有要更新的字段');
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    if (username !== undefined && username !== null) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        logger.warn('PUT', '用户名格式无效', { username });
        return NextResponse.json({ error: '用户名只能包含字母、数字和下划线，3-20个字符' }, { status: 400 });
      }
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('PUT', '用户不存在', { uid: session.uid });
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);

    if (username !== undefined && username !== null && username !== user.username) {
      const existingUsername = await db.get(`user:username:${username}`);
      if (existingUsername) {
        logger.warn('PUT', '用户名已被使用', { username });
        return NextResponse.json({ error: '该用户名已被使用' }, { status: 409 });
      }
    }

    if (user.username && username !== undefined && username !== user.username) {
      await db.del(`user:username:${user.username}`);
    }

    // 头像更新已禁用，头像仅从配置文件读取
    // if (avatar !== undefined) {
    //   // 需要手动更新 next.config.ts 中的 users 配置
    // }
    if (username !== undefined) user.username = username || null;
    if (name !== undefined) user.name = name;

    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    if (username) {
      await db.set(`user:username:${username}`, session.uid);
    }

    const currentAvatar = await getUserAvatarAsync(session.uid, session.role === 'admin' || session.role === 'sudo');

    logger.info('PUT', '资料更新成功', { uid: session.uid });
    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: currentAvatar || undefined,
        role: user.role,
        userGroup: user.userGroup,
      },
      message: '资料更新成功'
    }, { status: 201 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('PUT', '更新用户资料失败', { error: error.message });
    return NextResponse.json({ error: '更新用户资料失败' }, { status: 500 });
  }
}
