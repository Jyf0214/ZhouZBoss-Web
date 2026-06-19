/**
 * GET /api/diary/[id]/versions/[versionId]
 * 获取单个版本详情（含内容明文）
 * 需要管理员认证
 */
import { NextResponse } from 'next/server';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getDiaryVersion } from '@/lib/diary-version';

export const GET = apiHandler('GET', { label: '获取日记版本详情', requireAdmin: true }, async (_req, context) => {
  const versionId = await getParam(context, 'versionId');

  const version = await getDiaryVersion(versionId);
  if (!version) {
    return NextResponse.json({ error: '版本不存在' }, { status: 404 });
  }

  // 解析 JSON 格式的标签
  const tags = version.tags ? (() => { try { return JSON.parse(version.tags); } catch { return []; } })() : [];

  return NextResponse.json({
    version: {
      ...version,
      tags,
    },
  });
});
