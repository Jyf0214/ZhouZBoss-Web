import { type NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDb } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/webhooks/clerk');

/**
 * Clerk Webhook 处理
 * 同步 Clerk 用户事件到 Originium Kernel
 */
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    logger.error('POST', 'Webhook secret 未配置');
    return NextResponse.json({ error: 'Webhook 密钥未配置' }, { status: 500 });
  }

  // 验证 webhook 签名
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('POST', '缺少 svix 头');
    return NextResponse.json({ error: '缺少 svix 请求头' }, { status: 400 });
  }


  interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address?: string }[];
  };
}

// svix webhook payload 格式由外部定义，结构未知
let payload: ClerkWebhookPayload;
try {
  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  const verified = wh.verify(body, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  });
  payload = verified as ClerkWebhookPayload;
} catch {
    logger.warn('POST', '无效签名');
    return NextResponse.json({ error: '签名无效' }, { status: 401 });
  }

  const db = getDb();
  const eventType = payload.type;
  logger.info('POST', '收到 webhook 事件', { eventType });

  try {
    switch (eventType) {
      case 'user.created': {
        await handleUserCreated(payload.data, db);
        break;
      }

      case 'user.updated': {
        await handleUserUpdated(payload.data, db);
        break;
      }

      case 'user.deleted': {
        await handleUserDeleted(payload.data, db);
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('POST', 'Webhook 处理错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '内部错误' }, { status: 500 });
  }
}

async function handleUserCreated(
  data: { id: string; email_addresses?: { email_address?: string }[] },
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address;
  if (email) {
    await db.set(`clerk:email:${email}`, clerkId);
    logger.info('POST', '存储 Clerk 邮箱映射', { clerkId, email });
  }
}

async function handleUserUpdated(
  data: { id: string; email_addresses?: { email_address?: string }[] },
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address;
  if (email) {
    // 清理旧邮箱映射（邮箱变更时）
    const existingClerkId = await db.get(`clerk:email:${email}`);
    if (existingClerkId && existingClerkId !== clerkId) {
      await db.del(`clerk:email:${email}`);
    }
    // 查找并删除此 clerkId 的旧邮箱映射
    const oldEmail = await db.get(`clerk:id:${clerkId}`);
    if (oldEmail && oldEmail !== email) {
      await db.del(`clerk:email:${oldEmail}`);
    }
    await db.set(`clerk:email:${email}`, clerkId);
    await db.set(`clerk:id:${clerkId}`, email);
    logger.info('POST', '更新 Clerk 邮箱映射', { clerkId, email });
  }
}

async function handleUserDeleted(
  data: { id: string; email_addresses?: { email_address?: string }[] },
  db: ReturnType<typeof getDb>,
): Promise<void> {
  const clerkId = data.id;
  const boundUid = await db.get(`clerk:user:${clerkId}`);
  if (boundUid) {
    await db.del(`clerk:user:${clerkId}`);
    await db.del(`user:clerk:${boundUid}`);
    // 清理邮箱映射
    const oldEmail = await db.get(`clerk:id:${clerkId}`);
    if (oldEmail) {
      await db.del(`clerk:email:${oldEmail}`);
      await db.del(`clerk:id:${clerkId}`);
    }
    logger.info('POST', '清理 Clerk 绑定关系', { clerkId, boundUid });
    try {
      const { prisma } = await import('@/lib/db');
      await prisma.user.updateMany({
        where: { clerkId },
        data: { clerkId: null, clerkLinkedAt: null },
      });
    } catch {
      logger.warn('POST', '清除 Prisma clerkId 失败', { clerkId });
    }
  }
}
