/**
 * 密码安全哈希模块
 * 使用 AUTH_SECRET + 密码直接计算 HMAC-SHA256
 */
import { getSecret } from './auth';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const secret = getSecret();
  const keyData = encoder.encode(secret);
  const hash = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', hash, encoder.encode(password));
  const hashHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || storedHash.length !== 64) return false;
  const computed = await hashPassword(password);
  return computed === storedHash;
}
