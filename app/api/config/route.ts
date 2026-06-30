import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadConfig, type AppConfig, type SocialConfig } from '@/lib/config';
import { getFileFromGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';
import { zAppConfig } from '@/lib/config-schema';
import { logAudit } from '@/lib/audit';
import yaml from 'js-yaml';

const logger = createApiLogger('/api/config');

// 内存缓存：避免每次请求都调用 GitHub API
// 配置变更频率极低，5 分钟缓存足以覆盖大多数场景
type ConfigResponse = AppConfig & {
  _githubRepo?: string;
  _remoteConfig?: string;
  _remoteConfigStatus?: string;
  _remoteConfigError?: string;
};
let configCache: { data: ConfigResponse; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

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
  try {
    return await handleConfigGet();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('GET', '获取配置失败', { error: msg });
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

async function handleConfigGet() {
  // 检查内存缓存，命中则直接返回（剥离内部字段）
  const now = Date.now();
  if (configCache && now - configCache.timestamp < CACHE_TTL) {
    logger.info('GET', '使用缓存配置');
    const { _remoteConfig: _rc, _remoteConfigStatus: _rs, _remoteConfigError: _re, _githubRepo: _gr, ...publicCached } = configCache.data;
    return buildConfigResponse(publicCached);
  }

  logger.info('GET', '读取配置');
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  // 默认从本地 config.yaml 加载
  let config = loadConfig();
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
        // 将远程 YAML 解析后作为主配置返回，使用 Zod 校验确保数据完整
        const parsed = yaml.load(remote.content) as AppConfig | null;
        if (parsed) {
          const result = zAppConfig.safeParse(parsed);
          if (result.success) {
            config = result.data;
          } else {
            logger.warn('GET', '远程 YAML Zod 校验失败，回退到本地配置', { issues: result.error.issues.map(i => i.path.join('.')) });
          }
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

  const response: ConfigResponse = {
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
  // 更新内存缓存
  configCache = { data: response, timestamp: Date.now() };

  // 剥离内部/管理字段
  const { _remoteConfig, _remoteConfigStatus, _remoteConfigError, _githubRepo, ...publicConfig } = response;

  return buildConfigResponse(publicConfig);
}

/** 未认证用户剥离 access 规则和 users 映射，防止枚举安全边界和 UID */
async function buildConfigResponse(config: Record<string, unknown>) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    const { access: _access, users: _users, ...safeConfig } = config;
    return NextResponse.json(safeConfig, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
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
  if (!overrideAppearance) return base;
  const background = overrideAppearance.background
    ? { ...base.background, ...overrideAppearance.background }
    : base.background;
  const baseLoading = base.loading ?? { page: { type: 'spinner' as const }, navigation: { type: 'spinner' as const }, slogans: [] as string[] };
  const ovLoading = overrideAppearance.loading;
  const loading = ovLoading
    ? {
        page: { ...baseLoading.page, ...ovLoading.page } as typeof baseLoading.page,
        navigation: { ...baseLoading.navigation, ...ovLoading.navigation } as typeof baseLoading.navigation,
        slogans: ovLoading.slogans ?? baseLoading.slogans,
      }
    : baseLoading;
  return {
    fontSize: overrideAppearance.fontSize ?? base.fontSize,
    background,
    customCSS: overrideAppearance.customCSS ?? base.customCSS,
    customHead: overrideAppearance.customHead ?? base.customHead,
    loading,
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

function mergeMourn(
  base: AppConfig['mourn'],
  overrideMourn: Partial<AppConfig['mourn']> | undefined,
): AppConfig['mourn'] | undefined {
  if (!overrideMourn) return base;
  return { ...(base ?? { enable: false, days: [] }), ...overrideMourn };
}

function mergeHighlight(
  base: AppConfig['highlight'],
  overrideHighlight: Partial<AppConfig['highlight']> | undefined,
): AppConfig['highlight'] | undefined {
  if (!overrideHighlight) return base;
  return { ...(base ?? { theme: 'light', copy: true, lang: true, shrink: false, heightLimit: 330, wordWrap: true }), ...overrideHighlight };
}

function mergeCopy(
  base: AppConfig['copy'],
  overrideCopy: Partial<AppConfig['copy']> | undefined,
): AppConfig['copy'] | undefined {
  if (!overrideCopy) return base;
  return { ...(base ?? { enable: true, copyright: { enable: false, limitCount: 50 } }), ...overrideCopy };
}

function mergeSocial(
  base: AppConfig['social'],
  overrideSocial: Partial<AppConfig['social']> | undefined,
): AppConfig['social'] | undefined {
  if (!overrideSocial) return base;
  return { ...(base ?? {}), ...overrideSocial } as SocialConfig;
}

function mergeAuthorStatus(
  base: AppConfig['authorStatus'],
  overrideAuthorStatus: Partial<AppConfig['authorStatus']> | undefined,
): AppConfig['authorStatus'] | undefined {
  if (!overrideAuthorStatus) return base;
  return { ...(base ?? { enable: false, statusImg: '', skills: [] }), ...overrideAuthorStatus };
}

function mergeCover(
  base: AppConfig['cover'],
  overrideCover: Partial<AppConfig['cover']> | undefined,
): AppConfig['cover'] | undefined {
  if (!overrideCover) return base;
  return { ...(base ?? { indexEnable: true, asideEnable: true, archivesEnable: true, position: 'left', defaultCover: [] }), ...overrideCover };
}

function mergeErrorImg(
  base: AppConfig['errorImg'],
  overrideErrorImg: Partial<AppConfig['errorImg']> | undefined,
): AppConfig['errorImg'] | undefined {
  if (!overrideErrorImg) return base;
  return { ...(base ?? { flink: '/img/friend_404.gif', postPage: '/img/404.jpg' }), ...overrideErrorImg };
}

function mergePostMeta(
  base: AppConfig['postMeta'],
  overridePostMeta: Partial<AppConfig['postMeta']> | undefined,
): AppConfig['postMeta'] | undefined {
  if (!overridePostMeta) return base;
  const def: AppConfig['postMeta'] = { page: { dateType: 'created', dateFormat: 'simple', categories: true, tags: true, label: false }, post: { dateType: 'both', dateFormat: 'date', categories: true, tags: true, label: true, unread: false } };
  const baseFull = { ...def, ...base };
  return {
    ...baseFull,
    ...overridePostMeta,
    page: { ...baseFull.page, ...overridePostMeta.page },
    post: { ...baseFull.post, ...overridePostMeta.post },
  };
}

function mergeWordCount(
  base: AppConfig['wordcount'],
  overrideWordCount: Partial<AppConfig['wordcount']> | undefined,
): AppConfig['wordcount'] | undefined {
  if (!overrideWordCount) return base;
  return { ...(base ?? { enable: false, postWordcount: false, min2read: true, totalWordcount: false }), ...overrideWordCount };
}

function mergeToc(
  base: AppConfig['toc'],
  overrideToc: Partial<AppConfig['toc']> | undefined,
): AppConfig['toc'] | undefined {
  if (!overrideToc) return base;
  return { ...(base ?? { post: true, page: false, number: true, expand: false, styleSimple: false }), ...overrideToc };
}

function mergeCopyright(
  base: AppConfig['copyright'],
  overrideCopyright: Partial<AppConfig['copyright']> | undefined,
): AppConfig['copyright'] | undefined {
  if (!overrideCopyright) return base;
  return { ...(base ?? { enable: true, decode: false, authorHref: '', location: '中国', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', avatarSinks: true, authorImgBack: '', authorImgFront: '', authorLink: '/' }), ...overrideCopyright };
}

function mergeReward(
  base: AppConfig['reward'],
  overrideReward: Partial<AppConfig['reward']> | undefined,
): AppConfig['reward'] | undefined {
  if (!overrideReward) return base;
  return { ...(base ?? { enable: true, qrCodes: [] }), ...overrideReward };
}

function mergePostEdit(
  base: AppConfig['postEdit'],
  overridePostEdit: Partial<AppConfig['postEdit']> | undefined,
): AppConfig['postEdit'] | undefined {
  if (!overridePostEdit) return base;
  return { ...(base ?? { enable: false, github: false }), ...overridePostEdit };
}

function mergeShare(
  base: AppConfig['share'],
  overrideShare: Partial<AppConfig['share']> | undefined,
): AppConfig['share'] | undefined {
  if (!overrideShare) return base;
  const def = { sharejs: { enable: true, sites: 'facebook,twitter,wechat,weibo,qq' }, addtoany: { enable: false, item: 'facebook,twitter,wechat,sina_weibo,email,copy_link' } };
  return { ...def, ...base, ...overrideShare };
}

function mergeMainTone(
  base: AppConfig['mainTone'],
  overrideMainTone: Partial<AppConfig['mainTone']> | undefined,
): AppConfig['mainTone'] | undefined {
  if (!overrideMainTone) return base;
  return { ...(base ?? { enable: false, mode: 'api' }), ...overrideMainTone };
}

function mergeFooter(
  base: AppConfig['footer'],
  overrideFooter: Partial<AppConfig['footer']> | undefined,
): AppConfig['footer'] | undefined {
  if (!overrideFooter) return base;
  const def = { owner: { enable: true, since: 2020 }, customText: '', runtime: { enable: false, launchTime: '04/01/2021 00:00:00' } };
  return { ...def, ...base, ...overrideFooter };
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
    mourn: mergeMourn(base.mourn, override.mourn),
    highlight: mergeHighlight(base.highlight, override.highlight),
    copy: mergeCopy(base.copy, override.copy),
    social: mergeSocial(base.social, override.social),
    authorStatus: mergeAuthorStatus(base.authorStatus, override.authorStatus),
    cover: mergeCover(base.cover, override.cover),
    errorImg: mergeErrorImg(base.errorImg, override.errorImg),
    postMeta: mergePostMeta(base.postMeta, override.postMeta),
    wordcount: mergeWordCount(base.wordcount, override.wordcount),
    toc: mergeToc(base.toc, override.toc),
    copyright: mergeCopyright(base.copyright, override.copyright),
    reward: mergeReward(base.reward, override.reward),
    postEdit: mergePostEdit(base.postEdit, override.postEdit),
    share: mergeShare(base.share, override.share),
    mainTone: mergeMainTone(base.mainTone, override.mainTone),
    footer: mergeFooter(base.footer, override.footer),
    clerk: override.clerk ?? base.clerk,
    users: override.users ?? base.users,
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
    const rawConfig = await req.json() as Partial<AppConfig>;
    // PUT 有 Zod 校验，POST 也必须有，防止非法配置写入
    const validated = zAppConfig.partial().safeParse(rawConfig);
    if (!validated.success) {
      return NextResponse.json(
        { error: '配置校验失败: ' + validated.error.issues.map(i => i.path.join('.')).join(', ') },
        { status: 400 }
      );
    }
    const currentConfig = loadConfig();
    const mergedConfig = mergeAppConfig(currentConfig, validated.data);

    // 持久化到 GitHub（如果配置了远程仓库）
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubRepo && githubToken) {
      const yamlContent = yaml.dump(mergedConfig, { lineWidth: -1 });
      const ghRes = await fetch(`${new URL(req.url).origin}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          path: 'config.yaml',
          content: yamlContent,
          message: 'chore: update site config',
        }),
      });
      if (!ghRes.ok) {
        const ghErr = await ghRes.json().catch(() => ({}));
        logger.error('POST', '配置写入 GitHub 失败', { error: ghErr.error });
        return NextResponse.json({ error: '配置保存到远程仓库失败' }, { status: 500 });
      }
    }

    logger.info('POST', '配置已合并并持久化');
    void logAudit('config_update', 'config', '站点配置已更新', session.uid);
    // 配置已更新，清除缓存使下次 GET 重新拉取
    configCache = null;
    const { clearConfigCache } = await import('@/lib/config');
    clearConfigCache();
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error: unknown) {
    logger.error('POST', '更新配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

/**
 * 从 GitHub 拉取配置
 */
export async function PUT() {
  // 认证检查：仅管理员或超级管理员可同步远程配置
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('PUT', '无权限访问', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  logger.info('PUT', '开始从 GitHub 同步配置', { role: session.role });
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
    const parsed = yaml.load(remote.content) as Partial<AppConfig>;
    const validated = zAppConfig.safeParse(parsed);
    if (!validated.success) {
      logger.warn('PUT', '远程 YAML Zod 校验失败', { issues: validated.error.issues.map(i => i.path.join('.')) });
      return NextResponse.json({ error: '远程配置校验失败: ' + validated.error.issues.map(i => i.path.join('.')).join(', ') }, { status: 400 });
    }
    const currentConfig = loadConfig();
    const mergedConfig = mergeAppConfig(currentConfig, validated.data);

    logger.info('PUT', '从 GitHub 同步配置成功');
    void logAudit('config_update', 'config', '站点配置已从 GitHub 同步更新', session.uid);
    // 清除缓存，确保下次 GET 返回最新配置
    configCache = null;
    const { clearConfigCache } = await import('@/lib/config');
    clearConfigCache();
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    logger.error('PUT', '从 GitHub 同步配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}