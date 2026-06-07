/**
 * hash.ts 单元测试
 *
 * 覆盖范围:
 * - hashPassword 确定性 (同输入 → 同输出) 与格式
 * - verifyPassword 正确/错误密码
 * - verifyPassword 非法 hash 格式 (长度 ≠ 64)
 *
 * 注意:
 * - hashPassword 内部调用 getSecret() 读取 process.env.AUTH_SECRET
 *   每次测试都重置 AUTH_SECRET,以保证隔离
 * - 由于 Web Crypto API 的模块级缓存不在 hash.ts 中,无需 vi.resetModules()
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('hashPassword / verifyPassword', () => {
  const INITIAL_AUTH_KEY = process.env.AUTH_SECRET;
  const TEST_SECRET = 'a'.repeat(64);

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
    // 屏蔽 hash.ts 在 dev 模式下缺失 secret 时触发的 console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (INITIAL_AUTH_KEY === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = INITIAL_AUTH_KEY;
    }
    vi.restoreAllMocks();
  });

  it('hashPassword 是确定性的:同输入产生相同输出', async () => {
    const { hashPassword } = await import('@/lib/hash');
    const a = await hashPassword('hunter2');
    const b = await hashPassword('hunter2');
    expect(a).toBe(b);
  });

  it('hashPassword 返回 64 字符的小写十六进制字符串', async () => {
    const { hashPassword } = await import('@/lib/hash');
    const h = await hashPassword('hello');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('不同输入产生不同 hash', async () => {
    const { hashPassword } = await import('@/lib/hash');
    const a = await hashPassword('password-a');
    const b = await hashPassword('password-b');
    expect(a).not.toBe(b);
  });

  it('verifyPassword 对正确密码返回 true', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/hash');
    const h = await hashPassword('correct-password');
    expect(await verifyPassword('correct-password', h)).toBe(true);
  });

  it('verifyPassword 对错误密码返回 false', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/hash');
    const h = await hashPassword('correct-password');
    expect(await verifyPassword('wrong-password', h)).toBe(false);
  });

  it('verifyPassword 在 storedHash 长度为 0/短/长时返回 false', async () => {
    const { verifyPassword } = await import('@/lib/hash');
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', 'tooshort')).toBe(false);
    expect(await verifyPassword('anything', 'a'.repeat(63))).toBe(false);
    expect(await verifyPassword('anything', 'a'.repeat(65))).toBe(false);
    expect(await verifyPassword('anything', 'a'.repeat(1000))).toBe(false);
  });

  it('verifyPassword 对非十六进制的 64 字符 hash 返回 false', async () => {
    const { verifyPassword } = await import('@/lib/hash');
    // 64 字符长度合法,但包含非 hex 字符 'z' → 必然不等于真实 hash
    const fake = 'z'.repeat(64);
    expect(await verifyPassword('anything', fake)).toBe(false);
  });

  it('不同 secret 产生的 hash 不同 (hash 与 AUTH_SECRET 绑定)', async () => {
    const { hashPassword } = await import('@/lib/hash');
    const a = await hashPassword('same-password');
    process.env.AUTH_SECRET = 'b'.repeat(64);
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });
});
