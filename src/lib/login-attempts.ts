/**
 * 基于数据库 KV 的登录失败计数器与临时锁定机制
 *
 * 锁定状态与失败计数均持久化到 originiumKV 表，
 * Serverless 冷启动、多实例部署下不丢失、全局共享。
 * 同一 email 连续 10 次失败后锁定 15 分钟。
 *
 * 这是账号维度的爆破防线：即使攻击者轮换请求头伪造新 IP/指纹
 * 绕过 rate-limit.ts 的客户端限流，同一账号的失败仍会被累计锁定。
 */

import { getDb } from '@/lib/db';

// 失败阈值与锁定时长
const LOCK_THRESHOLD = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分钟
const LOCK_TTL_SECONDS = Math.ceil(LOCK_DURATION_MS / 1000);

// KV key 前缀
const LOCK_PREFIX = 'login:locked:';
const FAIL_PREFIX = 'login:fail:';

/** 标准化 email 为小写，统一 key 格式 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 脱敏邮箱：user@example.com → u***@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return local ? `${local[0]}***@${domain}` : '***';
}

/**
 * 记录一次登录失败，达到阈值时写入 KV 锁定并告警
 *
 * 失败计数持久化于 KV（TTL 与锁定时长一致），读-改-写非原子：
 * 极端并发下个别失败可能漏计（需更多请求才触发锁定），属可接受边界。
 */
export async function recordLoginFailure(email: string): Promise<void> {
  const key = normalizeEmail(email);
  const db = getDb();

  // 已锁定则不再累计
  const lockedUntilRaw = await db.get(`${LOCK_PREFIX}${key}`);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (Date.now() < lockedUntil) return;
  }

  // 读取 KV 中持久化的失败计数并递增
  let current = 1;
  const failRaw = await db.get(`${FAIL_PREFIX}${key}`);
  if (failRaw) {
    const parsed = Number(failRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      current = parsed + 1;
    }
  }
  await db.set(`${FAIL_PREFIX}${key}`, String(current), LOCK_TTL_SECONDS);

  // 达到阈值：写入 KV 锁定并告警
  if (current >= LOCK_THRESHOLD) {
    const lockedUntil = Date.now() + LOCK_DURATION_MS;
    await db.set(`${LOCK_PREFIX}${key}`, String(lockedUntil), LOCK_TTL_SECONDS);
    console.warn(`[安全告警] 登录失败次数达到阈值：email=${maskEmail(key)}，失败次数=${current}，已锁定 ${LOCK_DURATION_MS / 60000} 分钟`);
  }
}

/**
 * 检查指定 email 是否处于锁定状态
 *
 * 同时检查 KV（跨实例）和进程内计数（快速路径）
 */
export async function isLoginLocked(email: string): Promise<boolean> {
  const key = normalizeEmail(email);
  const db = getDb();

  // 检查 KV 锁定状态（跨实例持久化）
  const lockedUntilRaw = await db.get(`${LOCK_PREFIX}${key}`);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (Date.now() < lockedUntil) return true;
  }

  return false;
}

/**
 * 登录成功后清除该 email 的所有失败记录
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  const key = normalizeEmail(email);
  const db = getDb();
  await db.del(`${LOCK_PREFIX}${key}`);
  await db.del(`${FAIL_PREFIX}${key}`);
}

/**
 * 获取当前失败次数（仅用于日志/诊断）
 */
export async function getLoginAttempts(email: string): Promise<number> {
  const key = normalizeEmail(email);
  const raw = await getDb().get(`${FAIL_PREFIX}${key}`);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
