/**
 * diary-crypto.ts 单元测试
 *
 * 覆盖范围:
 * - encryptContent / decryptContent 往返一致性
 * - 相同明文两次加密产生不同密文 (IV 唯一性)
 * - 损坏密文 / 错误密钥解密抛出错误
 * - 缺少 aes_gcm: 前缀时,decryptContent 原样返回
 *
 * 注意:
 * - diary-crypto.ts 内部缓存了 derivedKey (模块级 Promise),
 *   因此 AUTH_SECRET 变更后必须 vi.resetModules() 才能用新密钥解密
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('encryptContent / decryptContent', () => {
  const INITIAL_AUTH_KEY = process.env.AUTH_SECRET;
  const TEST_SECRET = 'a'.repeat(64);

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
    vi.resetModules();
  });

  afterEach(() => {
    if (INITIAL_AUTH_KEY === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = INITIAL_AUTH_KEY;
    }
    vi.resetModules();
  });

  it('往返:加密 "hello" 再解密,得到原文', async () => {
    const { encryptContent, decryptContent } = await import('@/lib/diary-crypto');
    const plaintext = 'hello';
    const cipher = await encryptContent(plaintext);
    expect(await decryptContent(cipher)).toBe(plaintext);
  });

  it('往返:支持长文本、中文、特殊字符', async () => {
    const { encryptContent, decryptContent } = await import('@/lib/diary-crypto');
    const plaintext = '中文 / emoji 🎉 / "quotes" & <tags> / \n 多行\n  内容';
    const cipher = await encryptContent(plaintext);
    expect(await decryptContent(cipher)).toBe(plaintext);
  });

  it('加密输出以 "aes_gcm:" 前缀开头', async () => {
    const { encryptContent } = await import('@/lib/diary-crypto');
    const cipher = await encryptContent('hello');
    expect(cipher.startsWith('aes_gcm:')).toBe(true);
  });

  it('相同明文两次加密产生不同密文 (IV 唯一性)', async () => {
    const { encryptContent, decryptContent } = await import('@/lib/diary-crypto');
    const plaintext = 'identical input';
    const a = await encryptContent(plaintext);
    const b = await encryptContent(plaintext);
    expect(a).not.toBe(b);
    // 两者都应能解出原文
    expect(await decryptContent(a)).toBe(plaintext);
    expect(await decryptContent(b)).toBe(plaintext);
  });

  it('decryptContent 对无前缀的输入原样返回 (兼容明文回退)', async () => {
    const { decryptContent } = await import('@/lib/diary-crypto');
    const plain = 'this is not encrypted';
    expect(await decryptContent(plain)).toBe(plain);
  });

  it('decryptContent 对空字符串原样返回', async () => {
    const { decryptContent } = await import('@/lib/diary-crypto');
    expect(await decryptContent('')).toBe('');
  });

  it('decryptContent 对截断的密文抛出错误', async () => {
    const { encryptContent, decryptContent } = await import('@/lib/diary-crypto');
    const cipher = await encryptContent('original data here');
    // 截掉末尾 8 个 base64 字符
    const truncated = cipher.slice(0, cipher.length - 8);
    await expect(decryptContent(truncated)).rejects.toThrow();
  });

  it('decryptContent 对随机篡改的密文抛出错误', async () => {
    const { encryptContent, decryptContent } = await import('@/lib/diary-crypto');
    const cipher = await encryptContent('original data here');
    // 把 base64 payload 的最后 4 字符替换成别的字符
    const head = cipher.slice(0, cipher.length - 4);
    const tampered = `${head}XXXX`;
    await expect(decryptContent(tampered)).rejects.toThrow();
  });

  it('decryptContent 对错误密钥加密的密文抛出错误', async () => {
    // 步骤 1:用当前 secret 加密
    const { encryptContent } = await import('@/lib/diary-crypto');
    const cipher = await encryptContent('secret message');

    // 步骤 2:切换到不同的 secret 并重置模块,模拟「用错密钥」
    process.env.AUTH_SECRET = 'b'.repeat(64);
    vi.resetModules();
    const { decryptContent } = await import('@/lib/diary-crypto');

    await expect(decryptContent(cipher)).rejects.toThrow();
  });

  it('同 secret 下两个加密实例可双向解密 (模块级缓存不影响正确性)', async () => {
    // 第一次 import → 加密
    const mod1 = await import('@/lib/diary-crypto');
    const cipher = await mod1.encryptContent('cache-test');

    // 第二次 import (不走 resetModules) → 解密应仍成功
    const mod2 = await import('@/lib/diary-crypto');
    expect(await mod2.decryptContent(cipher)).toBe('cache-test');
  });
});
