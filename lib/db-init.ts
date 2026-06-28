/**
 * 运行时数据库初始化
 */
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { generateUID } from '@/lib/auth';

let initAttempted = false;
let initResult: { created: boolean; error?: string } | null = null;
let initPromise: Promise<{ created: boolean; error?: string }> | null = null;

export async function ensureAdminUser(): Promise<{ created: boolean; error?: string }> {
  // 已完成初始化，直接返回缓存结果
  if (initAttempted && initResult) {
    return initResult;
  }
  // 有正在进行的初始化，等待其完成（防止并发竞态）
  if (initPromise) {
    return initPromise;
  }
  initPromise = doInit();
  const result = await initPromise;
  initPromise = null;
  return result;
}

async function doInit(): Promise<{ created: boolean; error?: string }> {
  // 仅在初始化成功后设置 initAttempted，允许失败重试
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    initResult = { created: false };
    return initResult;
  }

  const db = getDb();

  try {
    const uid = await db.get(`user:email:${adminEmail}`);
    if (uid) {
      initResult = { created: false };
      return initResult;
    }
  } catch {
    initResult = { created: false, error: '数据库不可用，请检查 DATABASE_URL 配置' };
    return initResult;
  }

  try {
    const newUid = generateUID();
    const now = new Date().toISOString();
    const hashedPwd = await hashPassword(adminPassword);
    const username = adminEmail.split('@')[0];

    const newAdmin = {
      uid: newUid,
      email: adminEmail,
      username,
      password: hashedPwd,
      role: 'sudo' as const,
      createdAt: now,
      updatedAt: now,
    };

    await db.set(`user:uid:${newUid}`, JSON.stringify(newAdmin));
    await db.set(`user:email:${adminEmail}`, newUid);
    await db.set(`user:username:${username}`, newUid);

    console.warn(`[数据库初始化] ✓ 运行时创建管理员: ${adminEmail}`);
    initResult = { created: true };
    return initResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[数据库初始化] 管理员创建失败:', message);
    initResult = { created: false, error: message };
    return initResult;
  }
}

export function resetInitState(): void {
  initAttempted = false;
  initResult = null;
  initPromise = null;
}