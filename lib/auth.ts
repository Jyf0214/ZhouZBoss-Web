import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_EXPIRY_MS, SESSION_EXPIRY } from '@/lib/constants';

/**
 * Originium Kernel 认证逻辑（Serverless/Edge）
 */

export function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET 环境变量未配置，生产环境必须设置');
    }
    console.warn('⚠️ AUTH_SECRET 未配置，使用不安全的默认值，请尽快设置环境变量');
    return 'fallback-secret-at-least-32-chars-long';
  }
  return secret;
}

let _secret: Uint8Array | null = null;
function getSecretEncoder(): Uint8Array {
  if (!_secret) {
    _secret = new TextEncoder().encode(getSecret());
  }
  return _secret;
}

export { getSecretEncoder as getSecretEncoder };

export interface SessionPayload {
  uid: string;
  email: string;
  role: 'user' | 'admin' | 'sudo';
  userGroup?: string;
}

/**
 * 生成 UID
 */
export function generateUID(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `UID-${timestamp}-${randomStr}`;
}

/**
 * 创建新的会话 JWT
 */
export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + SESSION_EXPIRY_MS);
  const session = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getSecretEncoder());

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
 * 从 Cookie 获取当前会话
 */
export async function getSession(): Promise<SessionPayload | null> {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, getSecretEncoder(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
	} catch (err) {
		console.error('会话验证失败:', err);
		return null;
	}
}

/**
 * 删除当前会话
 */
export async function deleteSession() {
  (await cookies()).delete('session');
}

/**
 * 中间件辅助：保护路由
 */
export async function verifyAuth() {
  const session = await getSession();
  if (!session) {
    return { authenticated: false, session: null };
  }
  return { authenticated: true, session };
}

/**
 * 权限中间件 — 需要登录
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }
  return session;
}

/**
 * 权限中间件 — 需要管理员或超级管理员角色
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'sudo') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }
  return session;
}

/**
 * 权限中间件 — 仅限超级管理员
 */
export async function requireSudo() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }
  if (session.role !== 'sudo') {
    return NextResponse.json({ error: '需要超级管理员权限' }, { status: 403 });
  }
  return session;
}

/**
 * 检查用户是否拥有指定角色
 */
export function hasRole(session: SessionPayload | null, roles: Array<'user' | 'admin' | 'sudo'>): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}
