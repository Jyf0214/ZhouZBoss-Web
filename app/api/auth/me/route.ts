import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserAvatarAsync } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/auth/me');

/**
 * Get current user info from session
 */

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    logger.warn('GET', '未认证');
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    logger.info('GET', '获取当前用户信息');
    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      logger.warn('GET', '用户不存在', { uid: session.uid });
      return NextResponse.json({ authenticated: false, error: '用户不存在' }, { status: 401 });
    }

    const user = JSON.parse(userStr);
    const avatar = await getUserAvatarAsync(session.uid, session.role === 'admin' || session.role === 'sudo', user.email);
    
    logger.info('GET', '获取用户信息成功', { uid: session.uid });
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        userGroup: user.userGroup,
        avatar: avatar ?? undefined,
      }
    });
  } catch (error) {
    logger.error('GET', '获取用户信息失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ authenticated: false, error: '服务器内部错误' }, { status: 500 });
  }
}
