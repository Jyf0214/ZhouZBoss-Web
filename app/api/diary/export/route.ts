import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler } from '@/lib/api-handler';
import { decryptContentBatch } from '@/lib/diary-crypto';

// 分批导出上限，防止内存耗尽
const BATCH_SIZE = 100;
const MAX_ENTRIES = 10000;

export const GET = apiHandler('GET', { label: '导出日记', requireAdmin: true }, async () => {
  // 预检：日记总数超限则拒绝导出，避免内存耗尽
  const totalCount = await prisma.diary.count();
  if (totalCount > MAX_ENTRIES) {
    return NextResponse.json(
      { error: `日记总数 ${totalCount} 条超过导出上限 ${MAX_ENTRIES} 条，请缩小导出范围后重试。` },
      { status: 413 },
    );
  }

  const parts: string[] = [];
  let exportedCount = 0;

  // 分批读取并解密，避免一次性加载全部日记到内存
  for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
    const batch = await prisma.diary.findMany({
      orderBy: { date: 'desc' },
      skip: offset,
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    const decryptedContents = await decryptContentBatch(batch.map((d) => d.content));

    batch.forEach((d, i) => {
      const content = decryptedContents[i];
      const date = d.date.toISOString().slice(0, 10);
      const tags = d.tags.length > 0 ? d.tags.join(', ') : '';
      const pinned = d.pinned ? '是' : '否';

      const front = [
        `# ${d.title}`,
        '',
        `**日期**：${date}`,
      ];
      if (tags) front.push(`**标签**：${tags}`);
      front.push(`**置顶**：${pinned}`);
      front.push('', '---', '');

      parts.push([...front, content, '', '---', '', ''].join('\n'));
    });

    exportedCount += batch.length;
  }

  const markdown = [
    '# 日记导出',
    '',
    `**导出时间**：${new Date().toLocaleString('zh-CN')}`,
    `**日记总数**：${exportedCount}`,
    '',
    '---',
    '',
    ...parts,
  ].join('\n');

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="diary-export-${new Date().toISOString().slice(0, 10)}.md"`,
      'Cache-Control': 'private, no-store, no-cache',
    },
  });
});
