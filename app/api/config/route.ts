import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadConfigAsync, saveConfigToDb, hasDatabase } from '@/lib/config';
import type { AppConfig } from '@/lib/config';
import { getFileFromGithub, syncConfigToGithub } from '@/lib/github';
import yaml from 'js-yaml';

/**
 * System Configuration API
 *
 * 配置优先级：
 * 1. 数据库缓存（管理员通过此 API 修改的配置）
 * 2. GitHub config.yaml（远程同步配置）
 * 3. config.json（本地文件配置）
 * 4. 默认值
 *
 * 所有配置统一使用 AppConfig 结构
 */
export async function GET() {
  const config = await loadConfigAsync();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const newConfig = await req.json() as Partial<AppConfig>;
    const currentConfig = await loadConfigAsync();

    // 合并配置，保留未修改的字段
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
        }
        : currentConfig.access,
      auth: newConfig.auth
        ? { ...currentConfig.auth, ...newConfig.auth }
        : currentConfig.auth,
    };

    // 保存到数据库
    await saveConfigToDb(mergedConfig);

    // 如果有 GitHub 配置，同步站点配置到 GitHub
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubRepo && githubToken) {
      const yamlConfig = {
        siteTitle: mergedConfig.site.title,
        siteDescription: mergedConfig.site.description,
      };
      await syncConfigToGithub(githubRepo, githubToken, yamlConfig);
    }

    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error: unknown) {
    console.error('更新配置失败:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '保存失败' }, { status: 500 });
  }
}

/**
 * 强制从 GitHub 同步配置
 */
export async function PUT() {
  const db = hasDatabase();
  if (!db) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 400 });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

  try {
    const remote = await getFileFromGithub(repo, token, 'config.yaml');
    if (!remote) {
      return NextResponse.json({ error: 'config.yaml 不存在' }, { status: 404 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = yaml.load(remote.content) as any;
    const currentConfig = await loadConfigAsync();

    // 从 GitHub YAML 合并到当前配置
    const mergedConfig: AppConfig = {
      site: {
        title: parsed.siteTitle ?? currentConfig.site.title,
        description: parsed.siteDescription ?? currentConfig.site.description,
        heroTitleLine1: parsed.heroTitleLine1 ?? currentConfig.site.heroTitleLine1,
        heroTitleLine2: parsed.heroTitleLine2 ?? currentConfig.site.heroTitleLine2,
        lang: currentConfig.site.lang,
      },
      appearance: {
        background: parsed.background
          ? { ...currentConfig.appearance.background, ...parsed.background }
          : currentConfig.appearance.background,
        customCSS: parsed.customCSS ?? currentConfig.appearance.customCSS,
        customHead: parsed.customHead ?? currentConfig.appearance.customHead,
      },
      access: parsed.access
        ? {
          posts: { ...currentConfig.access.posts, ...parsed.access.posts },
          faces: { ...currentConfig.access.faces, ...parsed.access.faces },
        }
        : currentConfig.access,
      auth: parsed.auth
        ? { ...currentConfig.auth, ...parsed.auth }
        : currentConfig.auth,
    };

    await saveConfigToDb(mergedConfig);
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    console.error('从 GitHub 同步配置失败:', error);
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}