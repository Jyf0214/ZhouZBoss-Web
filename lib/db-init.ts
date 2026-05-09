/**
 * 运行时数据库初始化
 * 在 Vercel 等环境中，DATABASE_URL 可能仅在运行时可用，
 * 构建时的 db:init 脚本无法执行，因此需要在首次使用时初始化管理员账户。
 */
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { generateUID } from '@/lib/auth';

let initAttempted = false;
let initResult: { created: boolean; error?: string } | null = null;

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

    console.error(`[数据库初始化] ✓ 运行时创建管理员: ${adminEmail}`);
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