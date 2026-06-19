/**
 * 审计日志模块
 * 记录管理员操作到 Prisma auditLog 表
 */
import { prisma } from '@/lib/db';

/** 记录审计日志 */
export async function logAudit(
  action: string,
  resource: string,
  resourceId: string | null,
  operatorUid: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const detailsJson = JSON.stringify(details ?? {});
    await prisma.$executeRawUnsafe(
      'INSERT INTO audit_logs (action, resource, resource_id, operator_uid, details, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      action, resource, resourceId, operatorUid, detailsJson,
    );
  } catch {
    // 审计日志写入失败不应阻断业务流程
    console.error('[audit] 写入审计日志失败', { action, resource, resourceId, operatorUid });
  }
}

/** 查询审计日志 */
export async function queryAuditLogs(options: {
  action?: string;
  resource?: string;
  operatorUid?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const { action, resource, operatorUid, limit = 50, offset = 0 } = options;
  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (operatorUid) where.operatorUid = operatorUid;

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
