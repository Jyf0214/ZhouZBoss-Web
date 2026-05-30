/**
 * 运行时数据库初始化
 */
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { generateUID } from '@/lib/auth';

let initAttempted = false;
let initResult: { created: boolean; error?: string } | null = null;

function isLegacyPassword(password: string | undefined): boolean {
  return !!(password && password.includes(':') && password.split(':').length === 2);
}

export async function ensureAdminUser(): Promise<{ created: boolean; error?: string }> {
  if (initAttempted && initResult) {
    return initResult;
  }
  initAttempted = true;

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
      const userStr = await db.get(`user:uid:${uid}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        if (isLegacyPassword(user.password)) {
          const newHash = await hashPassword(adminPassword);
          user.password = newHash;
          await db.set(`user:uid:${uid}`, JSON.stringify(user));
          console.warn(`[数据库初始化] ✓ 迁移旧版用户密码: ${user.email ?? user.username ?? user.uid}`);
        } else {
          const newHash = await hashPassword(adminPassword);
          user.password = newHash;
          await db.set(`user:uid:${uid}`, JSON.stringify(user));
          console.warn(`[数据库初始化] ✓ 更新用户密码: ${user.email ?? user.username ?? user.uid}`);
        }
      }
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
}