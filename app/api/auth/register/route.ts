import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateUID, createSession } from '@/lib/auth';

/**
 * User Registration API
 * Originium Kernel - Registration only open for 'user' role
 */

export async function POST(req: NextRequest) {
  const requestId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${requestId}] Registration started`);
  
  try {
    const { email, password, name } = await req.json();
    console.log(`[${requestId}] Request data: email=${email}, name=${name}`);

    if (!email || !password || !name) {
      console.log(`[${requestId}] Missing required fields`);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate environment
    const databaseUrl = process.env.DATABASE_URL;
    const authSecret = process.env.AUTH_SECRET;
    
    console.log(`[${requestId}] Environment check: DATABASE_URL=${databaseUrl ? 'configured' : 'MISSING'}, AUTH_SECRET=${authSecret ? 'configured' : 'MISSING'}`);
    
    if (!databaseUrl) {
      console.error(`[${requestId}] DATABASE_URL is not configured`);
      return NextResponse.json({ 
        error: 'Database not configured',
        message: 'Please set DATABASE_URL environment variable'
      }, { status: 500 });
    }

    const db = getDb();
    console.log(`[${requestId}] Database connection established`);

    // Check if user already exists
    const existing = await db.get(`user:email:${email}`);
    if (existing) {
      console.log(`[${requestId}] User already exists: ${email}`);
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const uid = generateUID();
    const userRole = 'user';
    console.log(`[${requestId}] Generated UID: ${uid}`);

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
    console.log(`[${requestId}] Storing user data...`);
    await db.set(`user:uid:${uid}`, JSON.stringify(userPayload));
    await db.set(`user:email:${email}`, uid);

    // Add to global user list
    const userListStr = await db.get('users:all:list');
    const userList = userListStr ? JSON.parse(userListStr) : [];
    if (!userList.includes(uid)) {
      userList.push(uid);
      await db.set('users:all:list', JSON.stringify(userList));
    }

    // Create session
    console.log(`[${requestId}] Creating session...`);
    await createSession({
      uid,
      email,
      role: userRole,
    });

    console.log(`[${requestId}] Registration successful: ${uid}`);
    return NextResponse.json({ 
      success: true, 
      user: { uid, email, name, role: userRole },
      message: 'Registration successful'
    });
  } catch (error: any) {
    console.error(`[${requestId}] Registration error:`, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
