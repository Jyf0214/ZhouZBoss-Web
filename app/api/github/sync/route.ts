import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { syncConfigToGithub } from '@/lib/github';
import { loadConfigAsync } from '@/lib/config';
import { getDb } from '@/lib/db';
import { hasDatabase } from '@/lib/config';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/github/sync');

/**
 * 统一 GitHub 同步 API
 *
 * 功能：
 * - 同步配置到 GitHub（config.json）
 * - 统一日志记录
 * - 统一错误处理
 * - 同步成功后存储标志，防止重复提交
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('POST', '无权限', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubRepo || !githubToken) {
    logger.warn('POST', 'GitHub 未配置');
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { type = 'config', data } = body;

    logger.info('POST', '开始同步', { type });

    if (type === 'config') {
      const config = data || await loadConfigAsync();
      await syncConfigToGithub(githubRepo, githubToken, config);
      logger.info('POST', '配置同步成功');

      if (hasDatabase()) {
        const db = getDb();
        await db.set('github:sync:success', Date.now().toString());
        logger.info('POST', '已存储同步成功标志');
      }

      return NextResponse.json({ success: true, message: '配置同步成功' });
    }

    logger.warn('POST', '不支持的同步类型', { type });
    return NextResponse.json({ error: '不支持的同步类型' }, { status: 400 });
  } catch (error) {
    logger.error('POST', '同步失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '同步失败' },
      { status: 500 }
    );
  }
}
