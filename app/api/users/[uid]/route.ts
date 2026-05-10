import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { UserRole } from '@/lib/user';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await params;
    const db = getDb();
    const userStr = await db.get(`user:uid:${uid}`);
    
    if (!userStr) {
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
      status: user.status,
    });
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'sudo' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid } = await params;
    const db = getDb();
    const userStr = await db.get(`user:uid:${uid}`);
    
    if (!userStr) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    const body = await req.json();
    const { role, userGroup } = body;

    if (role !== undefined) {
      const validRoles: UserRole[] = ['user', 'admin', 'sudo'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      user.role = role;
    }

    if (userGroup !== undefined) {
      user.userGroup = userGroup || undefined;
    }

    await db.set(`user:uid:${uid}`, JSON.stringify(user));
    return NextResponse.json({
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      userGroup: user.userGroup,
      status: user.status,
    });
  } catch (error) {
    console.error('User PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
