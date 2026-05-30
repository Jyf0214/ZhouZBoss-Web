import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { AppConfig, SiteConfig, AppearanceConfig, AccessConfig, AuthConfig, UserConfig, ShareConfig, MainToneConfig, FooterConfig, FooterOwnerConfig, FooterRuntimeConfig, SharejsConfig, AddtoanyConfig, PostEditConfig, CopyrightConfig, TocConfig, WordCountConfig, PostMetaConfig, PostMetaDisplayConfig, PostMetaPostConfig, ErrorImgConfig, CoverConfig, AuthorStatusConfig, SocialConfig, CopyConfig, HighlightConfig, MournConfig, NavConfig, NavMenuItem, NavMenuGroup, RewardConfig, QRCodeItem } from '@/next.config';

export type { AppConfig, SiteConfig, AppearanceConfig, AccessConfig, AuthConfig, UserConfig, ShareConfig, MainToneConfig, FooterConfig, FooterOwnerConfig, FooterRuntimeConfig, SharejsConfig, AddtoanyConfig, PostEditConfig, CopyrightConfig, TocConfig, WordCountConfig, PostMetaConfig, PostMetaDisplayConfig, PostMetaPostConfig, ErrorImgConfig, CoverConfig, AuthorStatusConfig, SocialConfig, CopyConfig, HighlightConfig, MournConfig, NavConfig, NavMenuItem, NavMenuGroup, RewardConfig, QRCodeItem };

/**
 * 检测数据库是否可用（其他非配置页面使用，配置页面不再依赖数据库）
 */
export function hasDatabase(): boolean {
  return !!(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL_NON_POOLING);
}

/**
 * 从 config.yaml 加载配置。读取失败直接抛错，没有硬编码兜底。
 */
function loadConfigFromYaml(): AppConfig {
  const configPath = path.join(process.cwd(), 'config.yaml');
  const fileContent = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(fileContent) as AppConfig;
  return parsed;
}

/** 缓存已加载的配置 */
let cachedConfig: AppConfig | null = null;

/**
 * 同步加载配置（从 config.yaml）
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = loadConfigFromYaml();
  return cachedConfig;
}

/**
 * 判断路径是否匹配脱字符模式
 */
export function matchPath(pattern: string, target: string): boolean {
  if (pattern === '*') return true;
  if (pattern.startsWith('^')) {
    const prefix = pattern.slice(1);
    return target === prefix || target.startsWith(prefix + '/');
  }
  return target === pattern;
}

/**
 * 判断指定路径的内容是否可被某角色访问
 */
export function canAccess(
  section: 'posts' | 'faces' | 'diary',
  slug: string,
  isAuthenticated: boolean,
  hasDb = false,
  config?: AppConfig,
): boolean {
  const rules = (config ?? loadConfig()).access[section];

  const isPrivate = rules.private.some((p: string) => matchPath(p, slug));
  const isPublic = rules.public.some((p: string) => matchPath(p, slug));

  if (isPrivate && !hasDb) return false;
  if (isPrivate && hasDb) return isAuthenticated;
  if (isPublic) return true;
  return isAuthenticated;
}

/**
 * 过滤可访问的路径
 */
export function filterAccessibleSlugs(
  section: 'posts' | 'faces' | 'diary',
  slugs: string[],
  hasDb = false,
): string[] {
  return slugs.filter((slug) => canAccess(section, slug, false, hasDb));
}

/**
 * 获取用户头像（仅从配置文件读取）
 * 优先级：config.users[uid].avatar > auth.admin.avatar（仅当用户是管理员）
 */
export function getUserAvatarAsync(uid: string, isAdmin?: boolean): Promise<string | null> {
  return Promise.resolve(getUserAvatar(uid, isAdmin));
}

/**
 * 获取用户头像（同步，仅从配置文件读取）
 */
export function getUserAvatar(uid: string, isAdmin?: boolean): string | null {
  const config = loadConfig();

  if (config.users?.[uid]?.avatar) {
    return config.users[uid].avatar;
  }

  if (isAdmin && config.auth?.admin?.avatar) {
    return config.auth.admin.avatar;
  }

  return null;
}

