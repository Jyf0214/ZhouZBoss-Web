import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDb } from '@/lib/db';

/**
 * Clerk Webhook 处理
 * 同步 Clerk 用户事件到 Originium Kernel
 */
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // 验证 webhook 签名
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  let payload: any;
  try {
    const body = await req.text();
    const wh = new Webhook(WEBHOOK_SECRET);
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as any;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const db = getDb();
  const eventType = payload.type;

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
          } catch {}
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}