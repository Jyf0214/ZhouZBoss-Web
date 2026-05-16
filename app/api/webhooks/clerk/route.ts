import { NextRequest, NextResponse } from 'next/server';
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
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // 验证 webhook 签名
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('POST', '缺少 svix 头');
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // 验证 webhook 签名
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('POST', '缺少svix签名头');
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address?: string }>;
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const db = getDb();
  const eventType = payload.type;
  logger.info('POST', '收到 webhook 事件', { eventType });

  try {
    switch (eventType) {
      case 'user.created': {
        // Clerk 用户创建时，存储映射关系（暂不创建 Originium Kernel 用户）
        const clerkId = payload.data.id;
        const email = payload.data.email_addresses?.[0]?.email_address;
        if (email) {
          await db.set(`clerk:email:${email}`, clerkId);
          logger.info('POST', '存储 Clerk 邮箱映射', { clerkId, email });
        }
        break;
      }

      case 'user.updated': {
        const clerkId = payload.data.id;
        const email = payload.data.email_addresses?.[0]?.email_address;
        if (email) {
          await db.set(`clerk:email:${email}`, clerkId);
          logger.info('POST', '更新 Clerk 邮箱映射', { clerkId, email });
        }
        break;
      }

      case 'user.deleted': {
        // Clerk 用户删除时，清理绑定关系
        const clerkId = payload.data.id;
        const boundUid = await db.get(`clerk:user:${clerkId}`);
        if (boundUid) {
          await db.del(`clerk:user:${clerkId}`);
          await db.del(`user:clerk:${boundUid}`);
          logger.info('POST', '清理 Clerk 绑定关系', { clerkId, boundUid });
          // 尝试清除 Prisma 中的 clerkId
          try {
            const { prisma } = await import('@/lib/db');
            await prisma.user.updateMany({
              where: { clerkId },
              data: { clerkId: null, clerkLinkedAt: null },
            });
	} catch (error) {
			logger.warn('POST', '清除 Prisma clerkId 失败', { clerkId });
		}
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('POST', 'Webhook 处理错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

  const db = getDb();
  const eventType = payload.type;
  logger.info('POST', '收到Clerk webhook', { eventType });

  try {
    switch (eventType) {
      case 'user.created': {
        // Clerk 用户创建时，存储映射关系（暂不创建 Originium Kernel 用户）
        const clerkId = payload.data.id;
        const email = payload.data.email_addresses?.[0]?.email_address;
        if (email) {
          await db.set(`clerk:email:${email}`, clerkId);
        }
        break;
      }

      case 'user.updated': {
        const clerkId = payload.data.id;
        const email = payload.data.email_addresses?.[0]?.email_address;
        if (email) {
          await db.set(`clerk:email:${email}`, clerkId);
        }
        break;
      }

      case 'user.deleted': {
        // Clerk 用户删除时，清理绑定关系
        const clerkId = payload.data.id;
        const boundUid = await db.get(`clerk:user:${clerkId}`);
        if (boundUid) {
          await db.del(`clerk:user:${clerkId}`);
          await db.del(`user:clerk:${boundUid}`);
          // 尝试清除 Prisma 中的 clerkId
          try {
            const { prisma } = await import('@/lib/db');
            await prisma.user.updateMany({
              where: { clerkId },
              data: { clerkId: null, clerkLinkedAt: null },
            });
 	} catch (error) {
 			logger.error('POST', '清除Prisma clerkId失败', { error: error instanceof Error ? error.message : String(error) });
 		}
        }
        break;
      }
    }

    logger.info('POST', 'Webhook处理成功', { eventType });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('POST', 'Webhook处理失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}