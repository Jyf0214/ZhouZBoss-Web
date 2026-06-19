/**
 * 基于内存的登录失败计数器与临时锁定机制
 * 同一 email 连续 10 次失败后锁定 15 分钟
 */

// 失败阈值与锁定时长
const LOCK_THRESHOLD = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分钟

// 每条记录的结构
interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}

// key: normalized email (lowercase), value: 记录
const attempts = new Map<string, AttemptRecord>();

/**
 * 标准化 email 为小写，统一 key 格式
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 清理已过期的锁定记录（惰性清理，每次访问时触发）
 */
function cleanupIfNeeded(key: string, record: AttemptRecord): void {
  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    attempts.delete(key);
  }
}

/**
 * 记录一次登录失败，达到阈值时触发 console.warn 告警并锁定
 */
export function recordLoginFailure(email: string): void {
  const key = normalizeEmail(email);
  let record = attempts.get(key);

  // 如果已有锁定且未过期，不再增加计数
  if (record?.lockedUntil && Date.now() < record.lockedUntil) {
    return;
  }

  record ??= { count: 0 };

  record.count += 1;

  // 达到阈值：锁定并告警
  if (record.count >= LOCK_THRESHOLD) {
    record.lockedUntil = Date.now() + LOCK_DURATION_MS;
    console.warn(
      `[安全告警] 登录失败次数达到阈值：email=${key}，失败次数=${record.count}，已锁定 ${LOCK_DURATION_MS / 60000} 分钟`,
    );
  }

  attempts.set(key, record);
}

/**
 * 检查指定 email 是否处于锁定状态
 */
export function isLoginLocked(email: string): boolean {
  const key = normalizeEmail(email);
  const record = attempts.get(key);
  if (!record) return false;

  // 过期自动清理
  cleanupIfNeeded(key, record);

  // 重新获取（可能已被清理）
  const current = attempts.get(key);
  if (!current) return false;

  return !!current.lockedUntil && Date.now() < current.lockedUntil;
}

/**
 * 登录成功后清除该 email 的所有失败记录
 */
export function clearLoginAttempts(email: string): void {
  const key = normalizeEmail(email);
  attempts.delete(key);
}

/**
 * 获取当前失败次数（仅用于日志/诊断）
 */
export function getLoginAttempts(email: string): number {
  const key = normalizeEmail(email);
  const record = attempts.get(key);
  if (!record) return 0;

  cleanupIfNeeded(key, record);

  const current = attempts.get(key);
  return current?.count ?? 0;
}
