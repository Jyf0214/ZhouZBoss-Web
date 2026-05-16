import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/users');

/**
 * Users API
 * GET /api/users - List all users (sudo only)
 * GET /api/users/[username] - Get user by username
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      logger.warn('GET', '未授权');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('GET', '读取用户列表');
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const uid = searchParams.get('uid');

    // Get specific user by username (email prefix)
    if (username) {
      // Try to find by username (we store email, so extract username from email)
      const userListStr = await db.get('users:all:list');
      if (!userListStr) {
        logger.warn('GET', '用户不存在', { username });
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const users = JSON.parse(userListStr);
      let userData = null;

      for (const uid of users) {
        const userStr = await db.get(`user:uid:${uid}`);
        if (userStr) {
          const user = JSON.parse(userStr);
          const userUsername = user.email.split('@')[0];
          if (userUsername === username || user.uid === username) {
            userData = {
              uid: user.uid,
              name: user.name,
              email: user.email,
              createdAt: user.createdAt,
              role: user.role,
              userGroup: user.userGroup,
            };
            break;
          }
        }
      }

      if (!userData) {
        logger.warn('GET', '用户不存在', { username });
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json(userData);
    }

    // Get specific user by UID
    if (uid) {
      const userStr = await db.get(`user:uid:${uid}`);
      if (!userStr) {
        logger.warn('GET', '用户不存在', { uid });
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const user = JSON.parse(userStr);
      return NextResponse.json({
        uid: user.uid,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        role: user.role,
        userGroup: user.userGroup,
      });
    }

    // List all users (sudo only)
    if (session.role !== 'sudo' && session.role !== 'admin') {
      logger.warn('GET', '禁止访问', { role: session.role });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userListStr = await db.get('users:all:list');
    if (!userListStr) {
      return NextResponse.json([]);
    }

    const users = JSON.parse(userListStr);
    const allUsers = [];

    for (const uid of users) {
      const userStr = await db.get(`user:uid:${uid}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        allUsers.push({
          uid: user.uid,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          role: user.role,
          status: user.status,
          userGroup: user.userGroup,
        });
      }
    }

    return NextResponse.json(allUsers);
  } catch (error) {
    logger.error('GET', '用户API错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
