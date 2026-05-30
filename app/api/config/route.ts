import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadConfig, type AppConfig, type SocialConfig } from '@/lib/config';
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
  return { ...def, ...base, ...overridePostMeta };
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
    const currentConfig = loadConfig();
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
    const currentConfig = loadConfig();
    const mergedConfig = mergeAppConfig(currentConfig, parsed);

    logger.info('PUT', '从 GitHub 同步配置成功');
    return NextResponse.json({ success: true, config: mergedConfig });
  } catch (error) {
    logger.error('PUT', '从 GitHub 同步配置失败', { error: error instanceof Error ? error.message : '未知错误' });
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
}