import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler } from '@/lib/api-handler';
import { decryptContentBatch } from '@/lib/diary-crypto';

export const GET = apiHandler('GET', { label: '导出日记', requireAdmin: true }, async () => {
  const diaries = await prisma.diary.findMany({
    orderBy: { date: 'desc' },
  });

  // 批量并行解密所有日记内容
  const decryptedContents = await decryptContentBatch(diaries.map((d) => d.content));

  const parts: string[] = [];

  diaries.forEach((d, i) => {
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

  const markdown = [
    '# 日记导出',
    '',
    `**导出时间**：${new Date().toLocaleString('zh-CN')}`,
    `**日记总数**：${diaries.length}`,
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
