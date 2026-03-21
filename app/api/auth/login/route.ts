import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';

/**
 * User Login API
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const db = getDb();
    
    // Find UID by email
    const uid = await db.get(`user:email:${email}`);
    if (!uid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get user data
    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      return NextResponse.json({ error: 'User record corrupted' }, { status: 500 });
    }

    const user = JSON.parse(userStr);

    // Verify password (using the same simple hashing logic)
    const hashedPassword = Buffer.from(password).toString('hex').split('').reverse().join('');
    if (user.password !== hashedPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    return NextResponse.json({ success: true, user: { uid: user.uid, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
