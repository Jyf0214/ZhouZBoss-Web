/**
 * auth.ts 单元测试
 *
 * 覆盖范围:
 * - getSecret 长度/环境行为:
 *   - 生产 + 缺失 → 抛错
 *   - 生产 + 空字符串 → 抛错
 *   - 生产 + 4 字符 → 抛错 (新增:长度校验)
 *   - 开发 + 缺失 → 返回 64 字符随机 hex
 *   - 任意非空 → 原样返回 (当前实现未校验最小长度)
 * - createSession / getSession 往返 (mock cookies())
 * - requireAuth / requireAdmin / requireSudo 的 401/403 拒绝行为
 *
 * 注意:
 * - auth.ts 模块内有缓存的 _secret (Uint8Array),AUTH_SECRET 变更后
 *   必须 vi.resetModules() + 重新 import,否则仍用旧密钥
 * - next/headers 的 cookies() 通过 vi.mock 替换
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

// 必须在 vi.mock 之前声明;vi.hoisted 会被提升到文件顶端
const mockCookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// 绕过 TypeScript 将 NODE_ENV 视为 readonly 的限制 (测试需要临时覆盖)
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

describe('getSecret', () => {
  const INITIAL_AUTH_KEY = process.env.AUTH_SECRET;
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (INITIAL_AUTH_KEY === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = INITIAL_AUTH_KEY;
    }
    setEnv('NODE_ENV', ORIGINAL_NODE_ENV);
    vi.restoreAllMocks();
  });

  it('生产环境 + 缺失 AUTH_SECRET → 抛出错误', async () => {
    delete process.env.AUTH_SECRET;
    setEnv('NODE_ENV', 'production');
    const { getSecret } = await import('@/lib/auth');
    expect(() => getSecret()).toThrow(/AUTH_SECRET/);
  });

  it('生产环境 + AUTH_SECRET 为空字符串 → 抛出错误', async () => {
    process.env.AUTH_SECRET = '';
    setEnv('NODE_ENV', 'production');
    const { getSecret } = await import('@/lib/auth');
    expect(() => getSecret()).toThrow(/AUTH_SECRET/);
  });

  it('生产环境 + AUTH_SECRET 只有 4 个字符 → 抛出错误', async () => {
    process.env.AUTH_SECRET = 'abcd';
    setEnv('NODE_ENV', 'production');
    const { getSecret } = await import('@/lib/auth');
    expect(() => getSecret()).toThrow(/AUTH_SECRET/);
  });

  it('开发环境 + 缺失 AUTH_SECRET → 返回 64 字符随机 hex', async () => {
    delete process.env.AUTH_SECRET;
    setEnv('NODE_ENV', 'development');
    const { getSecret } = await import('@/lib/auth');
    const s = getSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });

  it('开发环境 + 缺失 AUTH_SECRET → 每次返回相同的缓存随机值', async () => {
    delete process.env.AUTH_SECRET;
    setEnv('NODE_ENV', 'development');
    const { getSecret } = await import('@/lib/auth');
    const a = getSecret();
    const b = getSecret();
    expect(a).toBe(b);
  });

  it('开发环境 + 缺失 AUTH_SECRET → createSession/getSession 往返成功', async () => {
    delete process.env.AUTH_SECRET;
    setEnv('NODE_ENV', 'development');
    const { createSession, getSession } = await import('@/lib/auth');

    let captured: string | undefined;
    mockCookieStore.set.mockImplementation((_name: string, value: string) => {
      captured = value;
    });
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'session' && captured) return { value: captured };
      return undefined;
    });

    const payload = { uid: 'UID-DEV', email: 'dev@test.com', role: 'admin' as const };
    await createSession(payload);
    const got = await getSession();
    expect(got).not.toBeNull();
    expect(got?.uid).toBe(payload.uid);
    expect(got?.role).toBe(payload.role);
  });

  it('AUTH_SECRET 长度 = 32 → 原样返回', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    setEnv('NODE_ENV', 'development');
    const { getSecret } = await import('@/lib/auth');
    expect(getSecret()).toBe('a'.repeat(32));
  });

  it('AUTH_SECRET 长度 > 32 → 原样返回', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(128);
    setEnv('NODE_ENV', 'production');
    const { getSecret } = await import('@/lib/auth');
    expect(getSecret()).toBe('a'.repeat(128));
  });
});

describe('createSession / getSession', () => {
  const TEST_SECRET = 'a'.repeat(64);

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
    setEnv('NODE_ENV', 'development');
    vi.resetModules();
    mockCookieStore.get.mockReset();
    mockCookieStore.set.mockReset();
    mockCookieStore.delete.mockReset();
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
    setEnv('NODE_ENV', undefined);
  });

  it('createSession 签名 JWT 并通过 cookies().set 写入 session', async () => {
    const { createSession } = await import('@/lib/auth');
    const session = await createSession({
      uid: 'UID-TEST-001',
      email: 'test@example.com',
      role: 'user',
    });

    expect(typeof session).toBe('string');
    expect(session.split('.').length).toBe(3); // header.payload.signature

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const call = mockCookieStore.set.mock.calls[0]!;
    expect(call[0]).toBe('session');
    expect(call[1]).toBe(session);
    expect(call[2]).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('createSession 在生产环境设置 secure: true', async () => {
    setEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { createSession } = await import('@/lib/auth');
    await createSession({ uid: 'U1', email: 'a@b.com', role: 'user' });
    const call = mockCookieStore.set.mock.calls[0]!;
    expect(call[2]).toMatchObject({ secure: true });
  });

  it('createSession → getSession 往返:payload 完整保留', async () => {
    const { createSession, getSession } = await import('@/lib/auth');

    // 共享的捕获 token 容器 — get mock 闭包引用
    let captured: string | undefined;
    mockCookieStore.set.mockImplementation((_name: string, value: string) => {
      captured = value;
    });
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'session' && captured) return { value: captured };
      return undefined;
    });

    const payload = {
      uid: 'UID-RT-001',
      email: 'rt@example.com',
      role: 'admin' as const,
      userGroup: 'vip',
    };
    await createSession(payload);
    const got = await getSession();
    expect(got).not.toBeNull();
    expect(got?.uid).toBe(payload.uid);
    expect(got?.email).toBe(payload.email);
    expect(got?.role).toBe(payload.role);
    expect(got?.userGroup).toBe(payload.userGroup);
  });

  it('getSession 在无 cookie 时返回 null', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const { getSession } = await import('@/lib/auth');
    expect(await getSession()).toBeNull();
  });

  it('getSession 对非法 JWT 返回 null (不抛出)', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'not.a.real.jwt' });
    const { getSession } = await import('@/lib/auth');
    expect(await getSession()).toBeNull();
  });

  it('getSession 对用错密钥签名的 JWT 返回 null', async () => {
    // 用 secret A 签发
    process.env.AUTH_SECRET = 'a'.repeat(64);
    vi.resetModules();
    const { createSession } = await import('@/lib/auth');
    const token = await createSession({ uid: 'U1', email: 'a@b.com', role: 'user' });

    // 切换到 secret B,getSession 用新密钥校验旧 token
    process.env.AUTH_SECRET = 'b'.repeat(64);
    vi.resetModules();
    mockCookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import('@/lib/auth');
    expect(await getSession()).toBeNull();
  });

  it('deleteSession 调用 cookies().delete("session")', async () => {
    const { deleteSession } = await import('@/lib/auth');
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('session');
  });
});

describe('requireAuth / requireAdmin / requireSudo', () => {
  const TEST_SECRET = 'a'.repeat(64);

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
    setEnv('NODE_ENV', 'development');
    vi.resetModules();
    mockCookieStore.get.mockReset();
    mockCookieStore.set.mockReset();
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
    setEnv('NODE_ENV', undefined);
  });

  // 工具:创建 session 并把 token 注入到 cookie mock
  async function authedAs(
    role: 'user' | 'admin' | 'sudo',
    overrides: Partial<{ uid: string; email: string; userGroup: string }> = {}
  ): Promise<void> {
    const { createSession } = await import('@/lib/auth');
    const token = await createSession({
      uid: overrides.uid ?? `UID-${role.toUpperCase()}`,
      email: overrides.email ?? `${role}@example.com`,
      role,
      userGroup: overrides.userGroup,
    });
    mockCookieStore.get.mockReturnValue({ value: token });
  }

  describe('requireAuth', () => {
    it('未登录 → 返回 401 JSON', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      const { requireAuth } = await import('@/lib/auth');
      const result = await requireAuth();
      expect(result).toBeInstanceOf(NextResponse);
      const response = result as NextResponse;
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toMatch(/登录/);
    });

    it('已登录 (user 角色) → 返回 session 对象', async () => {
      await authedAs('user');
      const { requireAuth } = await import('@/lib/auth');
      const result = await requireAuth();
      expect(result).toMatchObject({ role: 'user' });
    });
  });

  describe('requireAdmin', () => {
    it('未登录 → 返回 401', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      const { requireAdmin } = await import('@/lib/auth');
      const result = await requireAdmin();
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });

    it('user 角色 → 返回 403', async () => {
      await authedAs('user');
      const { requireAdmin } = await import('@/lib/auth');
      const result = await requireAdmin();
      expect(result).toBeInstanceOf(NextResponse);
      const response = result as NextResponse;
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/管理员/);
    });

    it('admin 角色 → 放行', async () => {
      await authedAs('admin');
      const { requireAdmin } = await import('@/lib/auth');
      const result = await requireAdmin();
      expect(result).toMatchObject({ role: 'admin' });
    });

    it('sudo 角色 → 放行 (admin 检查兼容 sudo)', async () => {
      await authedAs('sudo');
      const { requireAdmin } = await import('@/lib/auth');
      const result = await requireAdmin();
      expect(result).toMatchObject({ role: 'sudo' });
    });
  });

  describe('requireSudo', () => {
    it('未登录 → 返回 401', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      const { requireSudo } = await import('@/lib/auth');
      const result = await requireSudo();
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });

    it('user 角色 → 返回 403', async () => {
      await authedAs('user');
      const { requireSudo } = await import('@/lib/auth');
      const result = await requireSudo();
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
    });

    it('admin 角色 → 返回 403 (admin ≠ sudo)', async () => {
      await authedAs('admin');
      const { requireSudo } = await import('@/lib/auth');
      const result = await requireSudo();
      expect(result).toBeInstanceOf(NextResponse);
      const response = result as NextResponse;
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/超级管理员/);
    });

    it('sudo 角色 → 放行', async () => {
      await authedAs('sudo');
      const { requireSudo } = await import('@/lib/auth');
      const result = await requireSudo();
      expect(result).toMatchObject({ role: 'sudo' });
    });
  });
});

describe('hasRole', () => {
  it('null session → 总是 false', async () => {
    const { hasRole } = await import('@/lib/auth');
    expect(hasRole(null, ['admin', 'sudo'])).toBe(false);
  });

  it('user session 命中 user 角色', async () => {
    const { hasRole } = await import('@/lib/auth');
    const session = { uid: 'U1', email: 'a@b.com', role: 'user' as const };
    expect(hasRole(session, ['user'])).toBe(true);
  });

  it('user session 不命中 admin/sudo 角色', async () => {
    const { hasRole } = await import('@/lib/auth');
    const session = { uid: 'U1', email: 'a@b.com', role: 'user' as const };
    expect(hasRole(session, ['admin', 'sudo'])).toBe(false);
  });

  it('admin session 命中 admin 角色', async () => {
    const { hasRole } = await import('@/lib/auth');
    const session = { uid: 'A1', email: 'a@b.com', role: 'admin' as const };
    expect(hasRole(session, ['admin'])).toBe(true);
  });
});
