/**
 * API 密钥管理
 * GET    /api/auth/api-keys  → 列出当前用户的所有密钥
 * POST   /api/auth/api-keys  → 生成新密钥(返回一次明文)
 */
import { NextResponse } from 'next/server';
import { getSession, hashApiKey, generateApiKey } from '@/lib/auth';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';
import { parsePermissions, serializePermissions, type ApiKeyPermissions } from '@/lib/api-key-permissions';

/** 列出当前用户的 API 密钥(不返回明文) */
export const GET = apiHandler(
  'GET',
  { label: 'api-keys.list', requireAuth: true },
  async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const db = getDb();
    const hasPrisma = !!db.prisma;
    if (!db.prisma) {
      console.warn(`[api-keys.list] db.prisma=null uid=${session.uid}`);
      return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
    }

    try {
      const rows = await db.prisma.apiKey.findMany({
        where: { uid: session.uid },
        select: { id: true, name: true, permissions: true, lastUsed: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      // 解析 permissions JSON
      const result = rows.map(r => ({
        id: r.id,
        name: r.name,
        permissions: parsePermissions(r.permissions),
        lastUsed: r.lastUsed,
        createdAt: r.createdAt,
      }));
      console.warn(`[api-keys.list] uid="${session.uid}" count=${result.length}`);
      return NextResponse.json({ keys: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[api-keys.list] uid="${session.uid}" hasPrisma=${hasPrisma} error:`, msg);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
  }
);

/** 生成新的 API 密钥 */
export const POST = apiHandler(
  'POST',
  { label: 'api-keys.create', requireAuth: true },
  async (req) => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const db = getDb();
    if (!db.prisma) {
      return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
    }

    let body: { name?: string; permissions?: ApiKeyPermissions } = {};
    try {
      body = (await req.json()) as { name?: string; permissions?: ApiKeyPermissions };
    } catch {
      // 无 body 也允许
    }
    const name = (body.name ?? '').trim() || '未命名密钥';

    const rawKey = generateApiKey();
    const hashed = hashApiKey(rawKey);

    // 序列化权限(传入 null/undefined 不存储，表示全部权限)
    const permissionsJson = body.permissions ? serializePermissions(body.permissions) : null;

    try {
      const row = await db.prisma.apiKey.create({
        data: {
          uid: session.uid,
          key: hashed,
          name,
          ...(permissionsJson ? { permissions: permissionsJson } : {}),
        },
        select: { id: true, name: true, createdAt: true },
      });
      console.warn(`[api-keys.create] uid="${session.uid}" id=${row.id} name="${name}"`);
      // 明文仅此一次返回
      return NextResponse.json({ ...row, key: rawKey });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[api-keys.create] uid="${session.uid}" error:`, msg);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }
  }
);
