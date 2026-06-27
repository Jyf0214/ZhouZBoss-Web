/**
 * 审计日志模块
 * 记录管理员操作到 Prisma auditLog 表
 */
import { prisma } from '@/lib/db';

/** 记录审计日志 */
export async function logAudit(
  action: string,
  target: string,
  detail: string | null,
  userId: string,
  _extra?: Record<string, unknown>,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    await prismaAny.auditLog.create({
      data: {
        action,
        target,
        detail: detail ?? null,
        userId,
      },
    });
  } catch {
    // 审计日志写入失败不应阻断业务流程
    console.error('[audit] 写入审计日志失败', { action, target, detail, userId });
  }
}

/** 查询审计日志 */
export async function queryAuditLogs(options: {
  action?: string;
  target?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const { action, target, userId, limit = 50, offset = 0 } = options;
  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (target) where.target = target;
  if (userId) where.userId = userId;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const [items, total] = await Promise.all([
      prismaAny.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prismaAny.auditLog.count({ where }),
    ]);
    return { items, total };
  } catch {
    return { items: [], total: 0 };
  }
}
