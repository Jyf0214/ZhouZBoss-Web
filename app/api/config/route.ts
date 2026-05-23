import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadConfigAsync, type AppConfig } from '@/lib/config';
import { getFileFromGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';
import yaml from 'js-yaml';

const logger = createApiLogger('/api/config');

/**
 * System Configuration API
 *
 * 配置来源：
 * 1. config.yaml（本地文件）
 * 2. GitHub config.yaml（远程同步，通过 _remoteConfig 返回）
 *
 * 所有配置统一使用 AppConfig 结构
 */
export async function GET() {
  logger.info('GET', '读取配置');
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  // 默认从本地 config.yaml 加载
  let config = await loadConfigAsync();
  let remoteConfigRaw = '';
  let remoteConfigStatus = '';
  let remoteConfigError = '';

  // 优先从 GitHub 获取远程配置
  if (githubRepo && githubToken) {
    try {
      const remote = await getFileFromGithub(githubRepo, githubToken, 'config.yaml');
      if (remote) {
        remoteConfigRaw = remote.content;
        remoteConfigStatus = 'ok';
        // 将远程 YAML 解析后作为主配置返回
        const parsed = yaml.load(remote.content) as AppConfig | null;
        if (parsed) {
          config = parsed;
        }
        logger.info('GET', '远程配置已获取并作为主配置');
      } else {
        remoteConfigStatus = 'not_found';
        logger.info('GET', '远程 config.yaml 不存在，使用本地配置');
      }
    } catch (error) {
      remoteConfigStatus = 'error';
      remoteConfigError = error instanceof Error ? error.message : '未知错误';
      logger.error('GET', '获取远程配置失败，使用本地配置', { error: remoteConfigError });
    }
  } else {
    logger.info('GET', 'GitHub 未配置，使用本地配置');
  }

  const response: typeof config & {
    _githubRepo?: string;
    _remoteConfig?: string;
    _remoteConfigStatus?: string;
    _remoteConfigError?: string;
  } = {
    ...config,
    _remoteConfig: remoteConfigRaw,
    _remoteConfigStatus: remoteConfigStatus,
  };

  if (githubRepo) {
    response._githubRepo = githubRepo;
  }
  if (remoteConfigError) {
    response._remoteConfigError = remoteConfigError;
  }

  logger.info('GET', '配置读取成功', { source: remoteConfigStatus || 'local' });
  return NextResponse.json(response);
}

function mergeSite(
  base: AppConfig['site'],
  overrideSite: Partial<AppConfig['site']> | undefined,
): AppConfig['site'] {
  return {
    title: overrideSite?.title ?? base.title,
    description: overrideSite?.description ?? base.description,
    heroTitleLine1: overrideSite?.heroTitleLine1 ?? base.heroTitleLine1,
    heroTitleLine2: overrideSite?.heroTitleLine2 ?? base.heroTitleLine2,
    lang: overrideSite?.lang ?? base.lang,
  };
}

function mergeAppearance(
  base: AppConfig['appearance'],
  overrideAppearance: Partial<AppConfig['appearance']> | undefined,
): AppConfig['appearance'] {
  const background = overrideAppearance?.background
    ? { ...base.background, ...overrideAppearance.background }
    : base.background;
  return {
    background,
    customCSS: overrideAppearance?.customCSS ?? base.customCSS,
    customHead: overrideAppearance?.customHead ?? base.customHead,
  };
}

function mergeAccess(
  base: AppConfig['access'],
  overrideAccess: Partial<AppConfig['access']> | undefined,
): AppConfig['access'] {
  if (!overrideAccess) return base;
  return {
    posts: { ...base.posts, ...overrideAccess.posts },
    faces: { ...base.faces, ...overrideAccess.faces },
    diary: { ...base.diary, ...overrideAccess.diary },
  };
}

function mergeAuth(
  base: AppConfig['auth'],
  overrideAuth: Partial<AppConfig['auth']> | undefined,
): AppConfig['auth'] {
  if (!overrideAuth) return base;
  return { ...base, ...overrideAuth };
}

function mergeNav(
  base: AppConfig['nav'],
  overrideNav: Partial<AppConfig['nav']> | undefined,
): AppConfig['nav'] | undefined {
  if (!overrideNav) return base;
  return { ...(base ?? { enable: false, travelling: false, clock: false, menu: [] }), ...overrideNav };
}

function mergeAppConfig(
  base: AppConfig,
  override: Partial<AppConfig>,
): AppConfig {
  return {
    site: mergeSite(base.site, override.site),
    appearance: mergeAppearance(base.appearance, override.appearance),
    access: mergeAccess(base.access, override.access),
    auth: mergeAuth(base.auth, override.auth),
    nav: mergeNav(base.nav, override.nav),
  };
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
    const mergedConfig = mergeAppConfig(currentConfig, newConfig);

    logger.info('POST', '配置已合并');
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error: unknown) {
    logger.error('POST', '更新配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: error instanceof Error ? error.message : '保存失败' }, { status: 500 });
  }
}

/**
 * 从 GitHub 拉取配置
 */
export async function PUT() {
  logger.info('PUT', '开始从 GitHub 同步配置');
  const repo = process.env.GITHUB_REPO;
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
    const mergedConfig = mergeAppConfig(currentConfig, parsed);

    logger.info('PUT', '从 GitHub 同步配置成功');
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    logger.error('PUT', '从 GitHub 同步配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}