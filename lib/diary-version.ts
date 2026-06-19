/**
 * 日记版本历史服务
 * 保存每次编辑前的内容快照（加密前的明文），支持版本列表查询和单版本详情
 */
import { prisma } from '@/lib/db';

/** 最大历史版本数（防止无限增长） */
const MAX_VERSIONS = 50;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any;

/**
 * 保存日记版本快照（加密前调用）
 * 自动清理超出上限的旧版本
 */
export async function saveDiaryVersion(
  diaryId: string,
  content: string,
  title?: string,
  tags?: string[],
): Promise<void> {
  const tagsJson = tags ? JSON.stringify(tags) : null;

  await prismaAny.diaryVersion.create({
    data: {
      diaryId,
      content,
      title: title ?? null,
      tags: tagsJson,
    },
  });

  // 清理超出上限的旧版本（保留最新的 MAX_VERSIONS 条）
  const count: number = await prismaAny.diaryVersion.count({ where: { diaryId } });
  if (count > MAX_VERSIONS) {
    const excess = count - MAX_VERSIONS;
    const oldVersions: { id: string }[] = await prismaAny.diaryVersion.findMany({
      where: { diaryId },
      orderBy: { createdAt: 'asc' },
      take: excess,
      select: { id: true },
    });
    if (oldVersions.length > 0) {
      await prismaAny.diaryVersion.deleteMany({
        where: { id: { in: oldVersions.map((v: { id: string }) => v.id) } },
      });
    }
  }
}

/**
 * 获取指定日记的版本历史列表（按时间倒序）
 */
export async function getDiaryVersions(
  diaryId: string,
  limit = 20,
): Promise<{
  id: string;
  diaryId: string;
  title: string | null;
  tags: string | null;
  createdAt: Date;
}[]> {
  return prismaAny.diaryVersion.findMany({
    where: { diaryId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      diaryId: true,
      title: true,
      tags: true,
      createdAt: true,
    },
  });
}

/**
 * 获取单个版本详情（含内容）
 */
export async function getDiaryVersion(versionId: string) {
  return prismaAny.diaryVersion.findUnique({
    where: { id: versionId },
  });
}
