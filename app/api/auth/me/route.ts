import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * Get current user info from session
 */

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const db = getDb();
    const userStr = await db.get(`user:uid:${session.uid}`);
    if (!userStr) {
      return NextResponse.json({ authenticated: false, error: 'User not found' }, { status: 401 });
    }

    const user = JSON.parse(userStr);
    
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        userGroup: user.userGroup,
        photoURL: user.photoURL,
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ authenticated: false, error: 'Internal server error' }, { status: 500 });
  }
}
