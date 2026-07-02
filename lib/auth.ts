import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_EXPIRY_MS, SESSION_EXPIRY } from '@/lib/constants';
import { parsePermissions, type ApiKeyPermissions, type PermissionAction } from '@/lib/api-key-permissions';

/**
 * Originium Kernel 认证逻辑（Serverless/Edge）
 */

/**
 * 获取用于 JWT 签名的密钥。AUTH_SECRET 必须至少 32 个字符。
 * 生产环境强制要求配置 AUTH_SECRET 且长度 ≥ 32，缺失或过短会直接抛出错误。
 * 开发环境下若缺失或过短，会输出警告并退回到进程级缓存的随机临时密钥。
 */
let _devSecret: string | null = null;
export function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET 环境变量未配置或长度小于 32，生产环境必须设置至少 32 字符的密钥');
    }
    if (!_devSecret) {
      _devSecret = crypto.randomBytes(32).toString('hex');
      console.warn('[auth] AUTH_SECRET 未配置或长度不足 32 字符，使用随机临时密钥（仅开发环境，会话重启后失效）');
    }
    return _devSecret;
  }
  return secret;
}

/**
 * 获取 JWT 签名密钥的 Uint8Array 编码。
 * 不做模块级缓存，确保 AUTH_SECRET 变更后立即生效。
 */
function getSecretEncoder(): Uint8Array {
  return new TextEncoder().encode(getSecret());
}

export { getSecretEncoder as getSecretEncoder };

export interface SessionPayload {
  uid: string;
  email: string;
  role: 'user' | 'admin' | 'sudo';
  userGroup?: string;
  /** 会话版本号，密码修改时递增，用于吊销旧 JWT */
  sv?: number;
  /** API 密钥权限配置(Cookie 认证时为 undefined) */
  permissions?: ApiKeyPermissions;
}

/**
 * 生成 UID
 */
export function generateUID(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = crypto.randomBytes(3).toString('hex').substring(0, 5).toUpperCase();
  return `UID-${timestamp}-${randomStr}`;
}

/**
 * 创建新的会话 JWT
 */
export async function createSession(payload: SessionPayload) {
  // 从 KV 读取当前会话版本号，确保新 JWT 携带最新版本
  let sv = payload.sv;
  if (sv === undefined) {
    try {
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const currentSv = await db.get(`user:sv:${payload.uid}`);
      sv = currentSv !== null && currentSv !== undefined ? Number(currentSv) : 0;
    } catch {
      sv = 0;
    }
  }
  const expires = new Date(Date.now() + SESSION_EXPIRY_MS);
  const session = await new SignJWT({ ...payload, sv })
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

/** 2FA 临时令牌载荷 */
export interface TempTokenPayload {
  uid: string;
  purpose: '2fa_pending';
}

/**
 * 创建 2FA 临时令牌（5 分钟有效期）
 * 登录时密码验证通过但 2FA 未完成时返回给前端
 */
export async function createTempToken(uid: string): Promise<string> {
  const payload: TempTokenPayload = { uid, purpose: '2fa_pending' };
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getSecretEncoder());

  // 将临时令牌存入 cookie，便于 2FA 验证时提取
  (await cookies()).set('temp_2fa', token, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return token;
}

/**
 * 验证并解析 2FA 临时令牌
 * 返回令牌载荷或 null（无效/过期）
 */
export async function verifyTempToken(token: string): Promise<TempTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretEncoder(), {
      algorithms: ['HS256'],
    });
    if (payload.purpose !== '2fa_pending' || !payload.uid) {
      return null;
    }
    return { uid: payload.uid as string, purpose: '2fa_pending' };
  } catch {
    return null;
  }
}

/**
 * 清除 2FA 临时令牌 cookie
 */
export async function clearTempToken() {
  (await cookies()).delete('temp_2fa');
}

/**
 * 哈希 API 密钥(与密码哈希分离,使用 HMAC-SHA256)
 */
export function hashApiKey(raw: string): string {
  const secret = getSecret();
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

/**
 * 生成随机 API 密钥(格式: sk-xxxxxx)
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString('base64url');
  return `sk-${random}`;
}

/**
 * 从 Authorization 头解析 Bearer token 并验证 API 密钥
 */
async function getSessionFromApiKey(): Promise<SessionPayload | null> {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7).trim();
    if (!token?.startsWith('sk-')) return null;

    const { getDb } = await import('@/lib/db');
    const db = getDb();
    if (!db.prisma) return null;

    const hashed = hashApiKey(token);
    const row = await db.prisma.apiKey.findUnique({ where: { key: hashed } });
    if (!row) return null;

    // 更新最后使用时间(异步,不阻塞)
    db.prisma.apiKey.update({ where: { id: row.id }, data: { lastUsed: new Date() } }).catch(() => { /* best-effort */ });

    // 通过 UID 查用户信息构建 SessionPayload
    const userRaw = await db.get(`user:uid:${row.uid}`);
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as { uid: string; email: string; role: string; userGroup?: string };
    // role 白名单校验，防止损坏数据提权
    const validRoles = ['user', 'admin', 'sudo'] as const;
    const role = validRoles.includes(user.role as typeof validRoles[number]) ? user.role as SessionPayload['role'] : 'user';
    // 加载 API 密钥权限配置
    const permissions = parsePermissions(row.permissions);
    return {
      uid: user.uid,
      email: user.email,
      role,
      userGroup: user.userGroup,
      // permissions 为 null 表示全部权限(向后兼容)
      ...(permissions ? { permissions } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * 检查 JWT 会话是否已被吊销（密码修改后 sv 不匹配）
 */
async function isSessionRevoked(uid: string, sv: number): Promise<boolean> {
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const currentSv = await db.get(`user:sv:${uid}`);
  return currentSv !== null && currentSv !== undefined && Number(currentSv) !== sv;
}

/**
 * 从 Cookie / API 密钥获取当前会话
 *
 * 优先级:
 * 1. Cookie JWT session（浏览器场景）
 * 2. Authorization: Bearer sk-xxx（API 调用场景）
 */
export async function getSession(): Promise<SessionPayload | null> {
  // 1. 尝试 Cookie session
  const session = (await cookies()).get('session')?.value;
  if (session) {
    try {
      const { payload } = await jwtVerify(session, getSecretEncoder(), {
        algorithms: ['HS256'],
      });
      const typed = payload as unknown as SessionPayload;
      // 会话版本校验：密码修改后旧 JWT 自动失效
      const effectiveSv = typed.sv ?? 0;
      if (await isSessionRevoked(typed.uid, effectiveSv)) {
        return null;
      }
      return typed;
    } catch {
      // Cookie 无效,继续尝试 API 密钥
    }
  }

  // 2. 尝试 API 密钥
  return getSessionFromApiKey();
}

/**
 * 从 Cookie / API 密钥获取当前会话，同时返回 API 密钥 ID
 * 若通过 Cookie 认证，currentKeyId 为 null
 * 未认证时返回 null（与 getSession() 行为一致）
 */
/** 通过 API 密钥认证，返回会话和密钥 ID，失败返回 null */
async function authenticateApiKey(): Promise<{ session: SessionPayload; currentKeyId: string } | null> {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7).trim();
    if (!token?.startsWith('sk-')) return null;

    const { getDb } = await import('@/lib/db');
    const db = getDb();
    if (!db.prisma) return null;

    const hashed = hashApiKey(token);
    const row = await db.prisma.apiKey.findUnique({ where: { key: hashed } });
    if (!row) return null;

    // 更新最后使用时间(异步,不阻塞)
    db.prisma.apiKey.update({ where: { id: row.id }, data: { lastUsed: new Date() } }).catch(() => { /* best-effort */ });

    const userRaw = await db.get(`user:uid:${row.uid}`);
    if (!userRaw) return null;

    const user = JSON.parse(userRaw) as { uid: string; email: string; role: string; userGroup?: string };
    const validRoles = ['user', 'admin', 'sudo'] as const;
    const role = validRoles.includes(user.role as typeof validRoles[number]) ? user.role as SessionPayload['role'] : 'user';
    const permissions = parsePermissions(row.permissions);
    return {
      session: {
        uid: user.uid,
        email: user.email,
        role,
        userGroup: user.userGroup,
        ...(permissions ? { permissions } : {}),
      },
      currentKeyId: row.id,
    };
  } catch {
    return null;
  }
}

export async function getSessionWithKeyId(): Promise<{ session: SessionPayload; currentKeyId: string | null } | null> {
  // 1. 尝试 Cookie session
  const session = (await cookies()).get('session')?.value;
  if (session) {
    try {
      const { payload } = await jwtVerify(session, getSecretEncoder(), {
        algorithms: ['HS256'],
      });
      const typed = payload as unknown as SessionPayload;
      const effectiveSv = typed.sv ?? 0;
      if (await isSessionRevoked(typed.uid, effectiveSv)) {
        return null;
      }
      return { session: typed, currentKeyId: null };
    } catch {
      // Cookie 无效,继续尝试 API 密钥
    }
  }

  // 2. 尝试 API 密钥
  return authenticateApiKey();
}

/**
 * 删除当前会话
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('temp_2fa');
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
export function hasRole(session: SessionPayload | null, roles: ('user' | 'admin' | 'sudo')[]): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}

/**
 * API 密钥权限检查中间件
 *
 * 使用方式: 在 apiHandler 的 handler 内调用
 * @param session 当前会话
 * @param keyId API 密钥 ID(Cookie 认证时为 null)
 * @param action 要检查的操作标识
 * @returns 允许返回 null，禁止返回 NextResponse(403)
 */
export function requireApiKeyPermission(
  session: SessionPayload,
  keyId: string | null,
  action: PermissionAction,
): NextResponse | null {
  // Cookie 认证，不受限制
  if (keyId === null) return null;
  // 无权限配置，全部权限
  if (!session.permissions) return null;
  // 检查具体操作
  if (session.permissions.actions[action]) return null;
  return NextResponse.json(
    { error: `无权限: ${action}` },
    { status: 403 },
  );
}

/* ---------- 密码复杂度校验 ---------- */

const MIN_PASSWORD_LENGTH = 8;

/**
 * 校验密码复杂度
 * 要求: 最少 8 位，至少包含 1 个大写字母、1 个小写字母、1 个数字
 * 返回 { valid: true } 或 { valid: false, reasons: [...] }
 */
export function validatePasswordStrength(password: string): { valid: true } | { valid: false; reasons: string[] } {
  const reasons: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    reasons.push(`密码长度不能少于 ${MIN_PASSWORD_LENGTH} 位`);
  }
  if (!/[A-Z]/.test(password)) {
    reasons.push('密码必须包含至少 1 个大写字母');
  }
  if (!/[a-z]/.test(password)) {
    reasons.push('密码必须包含至少 1 个小写字母');
  }
  if (!/[0-9]/.test(password)) {
    reasons.push('密码必须包含至少 1 个数字');
  }

  if (reasons.length > 0) {
    return { valid: false, reasons };
  }
  return { valid: true };
}
