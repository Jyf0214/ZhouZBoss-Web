/**
 * 密码安全哈希模块
 *
 * 主路径:scrypt + 随机盐,格式为 `scrypt:<saltHex>:<hashHex>`。
 * 兼容路径:旧版 HMAC-SHA256(64 字符小写 hex)通过 `legacyVerifyPassword` 校验,
 * 由调用方在登录成功后异步重写为新格式以实现平滑升级。
 */
import { scrypt as scryptCb, randomBytes, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'crypto';
import { promisify } from 'util';
import { getSecret } from './auth';

// scrypt 回调存在多个重载,promisify 无法直接推断;显式声明 4 参形态。
type ScryptAsync = (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;
const scrypt = promisify(scryptCb) as unknown as ScryptAsync;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCHEME = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = (await scrypt(password, salt, KEY_BYTES, SCRYPT_PARAMS)).toString('hex');
  return `${SCHEME}:${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof stored !== 'string' || stored.length === 0) return false;
  const [scheme, salt, hashHex] = stored.split(':');
  if (scheme === SCHEME && salt && hashHex) {
    try {
      const computed = (await scrypt(password, salt, KEY_BYTES, SCRYPT_PARAMS)).toString('hex');
      const a = Buffer.from(hashHex, 'hex');
      const b = Buffer.from(computed, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  // 旧版:64 字符 HMAC-SHA256 hex
  if (stored.length === 64 && /^[a-f0-9]+$/.test(stored)) {
    return await legacyVerifyPassword(password, stored);
  }
  return false;
}

// 旧版 HMAC-SHA256 验证路径,用于支持旧密码自动升级
async function legacyVerifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const secret = getSecret();
  const keyData = encoder.encode(secret);
  const hashKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', hashKey, encoder.encode(password));
  const computed = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computed === storedHash;
}
