import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateUID, createSession } from '@/lib/auth';

/**
 * User Registration API
 * Originium Kernel - Registration only open for 'user' role
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    
    // Check if user already exists
    const existing = await db.get(`user:email:${email}`);
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const uid = generateUID();
    const userRole = 'user'; // Default role is user
    
    const userPayload = {
      uid,
      email,
      name,
      role: userRole,
      password, // Note: In production, this should be hashed
      createdAt: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'unknown',
      status: 'active',
    };

    // Store user data
    await db.set(`user:uid:${uid}`, JSON.stringify(userPayload));
    await db.set(`user:email:${email}`, uid);

    // Add to global user list for admin management
    const userListStr = await db.get('users:all:list');
    const userList = userListStr ? JSON.parse(userListStr) : [];
    if (!userList.includes(uid)) {
      userList.push(uid);
      await db.set('users:all:list', JSON.stringify(userList));
    }

    // Create session
    await createSession({
      uid,
      email,
      role: userRole,
    });

    return NextResponse.json({ success: true, user: { uid, email, name, role: userRole } });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
