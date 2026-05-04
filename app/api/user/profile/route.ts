import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getUserAvatar, saveUserAvatar } from '@/lib/config';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    const avatar = getUserAvatar(session.uid);

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: avatar || user.avatar || undefined,
        role: user.role,
        userGroup: user.userGroup,
        createdAt: user.createdAt,
        status: user.status,
      }
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(JSON.stringify({ type: 'get_profile_error', message: error.message }));
    return NextResponse.json({ error: '获取用户资料失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await req.json();
    const { avatar, username, name } = body;

    if (avatar === undefined && username === undefined && name === undefined) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    if (username !== undefined && username !== null) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return NextResponse.json({ error: '用户名只能包含字母、数字和下划线，3-20个字符' }, { status: 400 });
      }
    }

    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);

    if (username !== undefined && username !== null && username !== user.username) {
      const existingUsername = await db.get(`user:username:${username}`);
      if (existingUsername) {
        return NextResponse.json({ error: '该用户名已被使用' }, { status: 409 });
      }
    }

    if (user.username && username !== undefined && username !== user.username) {
      await db.del(`user:username:${user.username}`);
    }

    if (avatar !== undefined) {
      await saveUserAvatar(session.uid, avatar || '');
    }
    if (username !== undefined) user.username = username || null;
    if (name !== undefined) user.name = name;

    await db.set(`user:uid:${session.uid}`, JSON.stringify(user));

    if (username) {
      await db.set(`user:username:${username}`, session.uid);
    }

    const currentAvatar = getUserAvatar(session.uid);

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
    console.error(JSON.stringify({ type: 'update_profile_error', message: error.message }));
    return NextResponse.json({ error: '更新用户资料失败' }, { status: 500 });
  }
}
