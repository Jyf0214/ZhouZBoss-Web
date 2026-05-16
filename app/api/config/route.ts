import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadConfigAsync, saveConfigToDb, hasDatabase } from '@/lib/config';
import type { AppConfig } from '@/lib/config';
import { getFileFromGithub } from '@/lib/github';
import { getDb } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/config');

/**
 * System Configuration API
 *
 * 配置优先级：
 * 1. 数据库缓存（管理员通过此 API 修改的配置）
 * 2. GitHub config.yaml（远程同步配置）
 * 3. config.yaml（本地文件配置）
 * 4. 默认值
 *
 * 所有配置统一使用 AppConfig 结构
 */
export async function GET() {
  logger.info('GET', '读取配置');
  const config = await loadConfigAsync();
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  const response: typeof config & { _githubRepo?: string; _githubToken?: string } = {
    ...config,
  };

  if (githubRepo) {
    response._githubRepo = githubRepo;
  }
  if (githubToken) {
    response._githubToken = '***';
  }

  logger.info('GET', '配置读取成功');
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('POST', '无权限访问', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  logger.info('POST', '开始更新配置', { role: session.role });

  try {
    const newConfig = await req.json() as Partial<AppConfig>;
    const currentConfig = await loadConfigAsync();

    if (hasDatabase()) {
      const db = getDb();
      const syncFlag = await db.get('github:sync:success');
      if (syncFlag) {
        logger.warn('POST', '配置已同步到 GitHub，拒绝重复提交');
        return NextResponse.json(
          { error: '配置已同步到 GitHub，请等待构建完成后再次提交' },
          { status: 409 }
        );
      }
    }

    const mergedConfig: AppConfig = {
      site: {
        title: newConfig.site?.title ?? currentConfig.site.title,
        description: newConfig.site?.description ?? currentConfig.site.description,
        heroTitleLine1: newConfig.site?.heroTitleLine1 ?? currentConfig.site.heroTitleLine1,
        heroTitleLine2: newConfig.site?.heroTitleLine2 ?? currentConfig.site.heroTitleLine2,
        lang: newConfig.site?.lang ?? currentConfig.site.lang,
      },
      appearance: {
        background: newConfig.appearance?.background
          ? { ...currentConfig.appearance.background, ...newConfig.appearance.background }
          : currentConfig.appearance.background,
        customCSS: newConfig.appearance?.customCSS ?? currentConfig.appearance.customCSS,
        customHead: newConfig.appearance?.customHead ?? currentConfig.appearance.customHead,
      },
      access: newConfig.access
        ? {
          posts: { ...currentConfig.access.posts, ...newConfig.access.posts },
          faces: { ...currentConfig.access.faces, ...newConfig.access.faces },
          diary: { ...currentConfig.access.diary, ...newConfig.access.diary },
        }
        : currentConfig.access,
      auth: newConfig.auth
        ? { ...currentConfig.auth, ...newConfig.auth }
        : currentConfig.auth,
    };

    await saveConfigToDb(mergedConfig);
    logger.info('POST', '配置已保存至数据库');

    const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubRepo && githubToken) {
      try {
        const syncRes = await fetch('/api/github/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'config', data: mergedConfig }),
        });
        const syncData = await syncRes.json();
        if (!syncRes.ok) {
          throw new Error(syncData.error || '同步配置到 GitHub 失败');
        }
        logger.info('POST', '配置已同步至 GitHub');
      } catch (error) {
        logger.error('POST', '同步配置到 GitHub 失败', { error: error instanceof Error ? error.message : '未知错误' });
        return NextResponse.json(
          { error: error instanceof Error ? error.message : '同步配置到 GitHub 失败' },
          { status: 500 }
        );
      }
    }

    logger.info('POST', '配置更新成功');
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error: unknown) {
    logger.error('POST', '更新配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: error instanceof Error ? error.message : '保存失败' }, { status: 500 });
  }
}

/**
 * 强制从 GitHub 同步配置
 */
export async function PUT() {
  logger.info('PUT', '开始从 GitHub 强制同步配置');
  const db = hasDatabase();
  if (!db) {
    logger.warn('PUT', '数据库未配置');
    return NextResponse.json({ error: '数据库未配置' }, { status: 400 });
  }
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    logger.warn('PUT', 'GitHub 未配置');
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

  try {
    const remote = await getFileFromGithub(repo, token, 'config.yaml');
    if (!remote) {
      logger.warn('PUT', 'config.yaml 不存在');
      return NextResponse.json({ error: 'config.yaml 不存在' }, { status: 404 });
    }
    const parsed = JSON.parse(remote.content) as Partial<AppConfig>;
    const currentConfig = await loadConfigAsync();

    const mergedConfig: AppConfig = {
      site: {
        title: parsed.site?.title ?? currentConfig.site.title,
        description: parsed.site?.description ?? currentConfig.site.description,
        heroTitleLine1: parsed.site?.heroTitleLine1 ?? currentConfig.site.heroTitleLine1,
        heroTitleLine2: parsed.site?.heroTitleLine2 ?? currentConfig.site.heroTitleLine2,
        lang: parsed.site?.lang ?? currentConfig.site.lang,
      },
      appearance: {
        background: parsed.appearance?.background
          ? { ...currentConfig.appearance.background, ...parsed.appearance.background }
          : currentConfig.appearance.background,
        customCSS: parsed.appearance?.customCSS ?? currentConfig.appearance.customCSS,
        customHead: parsed.appearance?.customHead ?? currentConfig.appearance.customHead,
      },
      access: parsed.access
        ? {
          posts: { ...currentConfig.access.posts, ...parsed.access.posts },
          faces: { ...currentConfig.access.faces, ...parsed.access.faces },
          diary: { ...currentConfig.access.diary, ...parsed.access.diary },
        }
        : currentConfig.access,
      auth: parsed.auth
        ? { ...currentConfig.auth, ...parsed.auth }
        : currentConfig.auth,
    };

    await saveConfigToDb(mergedConfig);
    logger.info('PUT', '从 GitHub 同步配置成功');
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    logger.error('PUT', '从 GitHub 同步配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}