import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication logic for Originium Kernel (Serverless/Edge)
 */

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'fallback-secret-at-least-32-chars-long'
);

export interface SessionPayload {
  uid: string;
  email: string;
  role: 'user' | 'admin' | 'sudo';
  userGroup?: string;
}

/**
 * Generate UID (WID)
 */
export function generateUID(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `UID-${timestamp}-${randomStr}`;
}

/**
 * Create a new session JWT
 */
export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);

  (await cookies()).set('session', session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return session;
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, SECRET, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Delete current session
 */
export async function deleteSession() {
  (await cookies()).delete('session');
}

/**
 * Middleware helper to protect routes
 */
export async function verifyAuth(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return { authenticated: false, session: null };
  }
  return { authenticated: true, session };
}

/**
 * Permission Middleware - Require Authentication
 */
export async function requireAuth(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return session;
}

/**
 * Permission Middleware - Require Admin or Sudo role
 */
export async function requireAdmin(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'sudo') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return session;
}

/**
 * Permission Middleware - Require Sudo role only
 */
export async function requireSudo(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (session.role !== 'sudo') {
    return NextResponse.json({ error: 'Sudo access required' }, { status: 403 });
  }
  return session;
}

/**
 * Check if user has specific role
 */
export function hasRole(session: SessionPayload | null, roles: Array<'user' | 'admin' | 'sudo'>): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}
