import { NextResponse } from 'next/server';
import { loadConfig, clearConfigCache, type AppConfig } from '@/lib/config';
import { getFileFromGithub, updateFileInGithub } from '@/lib/github';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { zAppConfig } from '@/lib/config-schema';
import { logAudit } from '@/lib/audit';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import type { PermissionAction } from '@/lib/api-key-permissions';
import { getTranslate } from '@/i18n/translate';
import yaml from 'js-yaml';

const logger = createApiLogger('/api/config');

/**
 * API 密钥细粒度权限检查（配置读写）
 * Cookie 认证(浏览器)直接通过；密钥认证检查 settings_* 权限
 */
async function requireConfigPerm(action: PermissionAction): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, action);
}

/**
 * 通用配置段合并:override 存在时以 base 为基础展开 override。
 * base 来自 loadConfig()，已通过 Zod schema 获得完整默认值，无需额外 defaults。
 * 适用于大多数结构为"扁平或浅层嵌套 + 可选默认值"的配置段。
 * 复杂嵌套合并(如 appearance、postMeta)仍保留专用函数。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeSection<T extends Record<string, any>>(
  base: T | undefined,
  override: Partial<T> | undefined,
): T | undefined {
  if (!override) return base;
  return { ...(base), ...override } as T;
}

function mergeAppearance(
  base: AppConfig['appearance'],
  override: Partial<AppConfig['appearance']> | undefined,
): AppConfig['appearance'] {
  if (!override) return base;
  const background = override.background
    ? { ...base.background, ...override.background }
    : base.background;
  const fontFamily = override.fontFamily
    ? { ...base.fontFamily, ...override.fontFamily }
    : base.fontFamily;
  const baseLoading = base.loading ?? { page: { type: 'spinner' as const }, navigation: { type: 'spinner' as const }, slogans: [] as string[] };
  const ovLoading = override.loading;
  const loading = ovLoading
    ? {
        page: { ...baseLoading.page, ...ovLoading.page } as typeof baseLoading.page,
        navigation: { ...baseLoading.navigation, ...ovLoading.navigation } as typeof baseLoading.navigation,
        slogans: ovLoading.slogans ?? baseLoading.slogans,
      }
    : baseLoading;
  return {
    fontSize: override.fontSize ?? base.fontSize,
    favicon: override.favicon ?? base.favicon,
    fontFamily,
    background,
    customCSS: override.customCSS ?? base.customCSS,
    customHead: override.customHead ?? base.customHead,
    loading,
    effects: override.effects ?? base.effects,
  };
}

function mergeAccess(
  base: AppConfig['access'],
  override: Partial<AppConfig['access']> | undefined,
): AppConfig['access'] {
  if (!override) return base;
  return {
    posts: { ...base.posts, ...override.posts },
    faces: { ...base.faces, ...override.faces },
    diary: { ...base.diary, ...override.diary },
  };
}

function mergePostMeta(
  base: AppConfig['postMeta'],
  override: Partial<AppConfig['postMeta']> | undefined,
): AppConfig['postMeta'] | undefined {
  if (!override) return base;
  if (!base) return override as AppConfig['postMeta'];
  return {
    ...base,
    ...override,
    page: { ...base.page, ...override.page },
    post: { ...base.post, ...override.post },
  };
}

/** 合并 App 配置:每个段调用 mergeSection 或专用合并函数 */
function mergeFooter(
  base: AppConfig['footer'],
  override: Partial<AppConfig['footer']> | undefined,
): AppConfig['footer'] {
  if (!override) return base;
  const b = base as NonNullable<AppConfig['footer']>;
  const owner = override.owner ? { ...b.owner, ...override.owner } : b.owner;
  const runtime = override.runtime
    ? {
        ...b.runtime,
        ...override.runtime,
        onlineHours: override.runtime.onlineHours
          ? { ...b.runtime.onlineHours, ...override.runtime.onlineHours }
          : b.runtime.onlineHours,
        statusText: override.runtime.statusText
          ? { ...b.runtime.statusText, ...override.runtime.statusText }
          : b.runtime.statusText,
      }
    : b.runtime;
  // 过滤 undefined 覆盖，避免将必填字段（如 customText）设为 undefined
  const filteredOverride = Object.fromEntries(
    Object.entries(override).filter(([, v]) => v !== undefined),
  ) as Partial<AppConfig['footer']>;
  const result: AppConfig['footer'] = {
    ...b,
    ...filteredOverride,
    owner,
    runtime,
  };
  return result;
}

function mergeAppConfig(
  base: AppConfig,
  override: Partial<AppConfig>,
): AppConfig {
  return {
    // site: 逐字段覆盖(base 无默认值,override 直接展开即可)
    site: { ...base.site, ...override.site },
    appearance: mergeAppearance(base.appearance, override.appearance),
    access: mergeAccess(base.access, override.access),
    auth: { ...base.auth, ...override.auth },
    avatar: override.avatar ?? base.avatar,
    nav: mergeSection(base.nav, override.nav),
    mourn: mergeSection(base.mourn, override.mourn),
    highlight: mergeSection(base.highlight, override.highlight),
    copy: mergeSection(base.copy, override.copy),
    social: mergeSection(base.social, override.social),
    cover: mergeSection(base.cover, override.cover),
    errorImg: mergeSection(base.errorImg, override.errorImg),
    postMeta: mergePostMeta(base.postMeta, override.postMeta),
    wordcount: mergeSection(base.wordcount, override.wordcount),
    toc: mergeSection(base.toc, override.toc),
    copyright: mergeSection(base.copyright, override.copyright),
    reward: mergeSection(base.reward, override.reward),
    postEdit: mergeSection(base.postEdit, override.postEdit),
    share: mergeSection(base.share, override.share),
    mainTone: mergeSection(base.mainTone, override.mainTone),
    footer: mergeFooter(base.footer, override.footer),
    music: mergeSection(base.music, override.music),
  };
}

export const POST = apiHandler('POST', { label: getTranslate('api.config.updateLabel'), requireRoot: true }, async (req, _ctx, session) => {
  logger.info('POST', '开始更新配置', { role: session?.role });

  const denied = await requireConfigPerm('settings_write');
  if (denied) return denied;

  const rawConfig = await req.json() as Partial<AppConfig>;
  // PUT 有 Zod 校验，POST 也必须有，防止非法配置写入
  const validated = zAppConfig.partial().safeParse(rawConfig);
  if (!validated.success) {
    return NextResponse.json(
      { error: getTranslate('api.config.validationFailed') + validated.error.issues.map(i => i.path.join('.')).join(', ') },
      { status: 400 }
    );
  }
  const currentConfig = await loadConfig();
  const mergedConfig = mergeAppConfig(currentConfig, validated.data);

  // 持久化到 GitHub；未配置远程仓库时明确报错（配置无法持久化时禁止"假成功"）
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubRepo || !githubToken) {
    logger.warn('POST', 'GitHub 仓库未配置，配置更改无法持久化');
    return NextResponse.json(
      { error: getTranslate('api.config.githubNotConfigured') },
      { status: 500 },
    );
  }
  const yamlContent = yaml.dump(mergedConfig, { lineWidth: -1 });
  try {
    await updateFileInGithub({
      repo: githubRepo,
      token: githubToken,
      path: 'config.yaml',
      content: yamlContent,
      message: 'chore: update site config',
    });
  } catch (err) {
    logger.error('POST', '配置写入 GitHub 失败', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: getTranslate('api.config.saveToRemoteFailed') }, { status: 500 });
  }

  logger.info('POST', '配置已合并并持久化');
  void logAudit('config_update', 'config', getTranslate('api.config.updated'), session?.uid ?? 'unknown');
  clearConfigCache();
  return NextResponse.json({ success: true, config: mergedConfig });
});

/**
 * 获取当前配置与 GitHub 远程配置状态
 *
 * 返回本地 loadConfig() 的完整配置，并附带 GitHub 同步状态元信息
 * （githubConfigured / _remoteConfig / _remoteConfigStatus / _remoteConfigError）。
 * 前端 dashboard 配置页与设置页依赖这些字段做差异对比。
 */
export const GET = apiHandler('GET', { label: getTranslate('api.config.getLabel'), requireRoot: true }, async () => {
  logger.info('GET', '获取当前配置');

  const denied = await requireConfigPerm('settings_read');
  if (denied) return denied;

  const config = await loadConfig();
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const githubConfigured = !!repo && !!token;

  let remoteConfig = '';
  let remoteStatus = '';
  let remoteError = '';

  if (!githubConfigured) {
    remoteStatus = getTranslate('api.config.githubNotConfigured');
  } else {
    try {
      const remote = await getFileFromGithub(repo, token, 'config.yaml');
      if (remote) {
        remoteConfig = remote.content;
        remoteStatus = getTranslate('api.config.remoteSynced');
      } else {
        remoteStatus = getTranslate('api.config.yamlNotFound');
      }
    } catch (err) {
      remoteStatus = getTranslate('api.config.remoteFetchFailed');
      remoteError = err instanceof Error ? err.message : String(err);
      logger.error('GET', '拉取远程配置失败', { error: remoteError });
    }
  }

  return NextResponse.json({
    ...config,
    githubConfigured,
    _remoteConfig: remoteConfig,
    _remoteConfigStatus: remoteStatus,
    _remoteConfigError: remoteError,
  });
});