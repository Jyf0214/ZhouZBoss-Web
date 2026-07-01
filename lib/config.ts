import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { zAppConfig, type AppConfig, type SiteConfig, type AppearanceConfig, type AccessConfig, type AuthConfig, type UserConfig, type ShareConfig, type MainToneConfig, type FooterConfig, type ClerkConfig, type FooterOwnerConfig, type FooterRuntimeConfig, type SharejsConfig, type AddtoanyConfig, type PostEditConfig, type CopyrightConfig, type TocConfig, type WordCountConfig, type PostMetaConfig, type PostMetaDisplayConfig, type PostMetaPostConfig, type ErrorImgConfig, type CoverConfig, type AuthorStatusConfig, type SocialConfig, type CopyConfig, type HighlightConfig, type MournConfig, type NavConfig, type NavMenuItem, type NavMenuGroup, type RewardConfig, type QRCodeItem } from '@/lib/config-schema';

export type {
  AppConfig,
  SiteConfig,
  AppearanceConfig,
  AccessConfig,
  AuthConfig,
  UserConfig,
  ShareConfig,
  MainToneConfig,
  FooterConfig,
  ClerkConfig,
  FooterOwnerConfig,
  FooterRuntimeConfig,
  SharejsConfig,
  AddtoanyConfig,
  PostEditConfig,
  CopyrightConfig,
  TocConfig,
  WordCountConfig,
  PostMetaConfig,
  PostMetaDisplayConfig,
  PostMetaPostConfig,
  ErrorImgConfig,
  CoverConfig,
  AuthorStatusConfig,
  SocialConfig,
  CopyConfig,
  HighlightConfig,
  MournConfig,
  NavConfig,
  NavMenuItem,
  NavMenuGroup,
  RewardConfig,
  QRCodeItem,
};

/**
 * 检测数据库是否可用（其他非配置页面使用，配置页面不再依赖数据库）
 */
export function hasDatabase(): boolean {
  return !!(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL_NON_POOLING);
}

/**
 * 从 config.yaml 加载配置。
 *
 * 行为:
 * - 文件存在:读取并用 zAppConfig.safeParse 校验;校验失败抛错并列出问题字段
 * - 文件不存在:返回 zAppConfig.parse({}),即全部使用 schema 默认值
 *
 * 注意:此处不再使用 `as AppConfig` 强制断言 — 任何结构错误都会在加载阶段
 * 立即暴露,避免运行时静默接受错误配置。
 */
function loadConfigFromYaml(): AppConfig {
  const configPath = path.join(process.cwd(), 'config.yaml');

  if (!fs.existsSync(configPath)) {
    return zAppConfig.parse({});
  }

  const fileContent = fs.readFileSync(configPath, 'utf-8');
  const raw = yaml.load(fileContent);
  const result = zAppConfig.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`config.yaml 校验失败:\n${issues}`);
  }

  return result.data;
}

/** 缓存已加载的配置 */
let cachedConfig: AppConfig | null = null;

/** 清除配置缓存，使下次 loadConfig() 重新从 config.yaml 加载 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

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
 * 优先级：config.users[uid].avatar > config.users 中 email 匹配 > auth.admin.avatar（仅当用户是管理员）
 */
export function getUserAvatarAsync(uid: string, isAdmin?: boolean, email?: string): Promise<string | null> {
  return Promise.resolve(getUserAvatar(uid, isAdmin, email));
}

/**
 * 获取用户头像（同步，仅从配置文件读取）
 */
export function getUserAvatar(uid: string, isAdmin?: boolean, email?: string): string | null {
  const config = loadConfig();

  if (config.users?.[uid]?.avatar) {
    console.warn('[getUserAvatar] UID 匹配', { uid });
    return config.users[uid].avatar;
  }

  // 按 email 匹配：config.users 的键可能是 UID 也可能是 email
  if (email && config.users?.[email]?.avatar) {
    console.warn('[getUserAvatar] email 匹配', { email });
    return config.users[email].avatar;
  }

  if (isAdmin && config.auth?.admin?.avatar) {
    console.warn('[getUserAvatar] admin fallback', { isAdmin });
    return config.auth.admin.avatar;
  }

  // 诊断日志：头像查找失败时输出可用信息
  console.warn('[getUserAvatar] 未找到头像', {
    uid,
    email,
    isAdmin,
    usersKeys: config.users ? Object.keys(config.users) : [],
  });

  return null;
}
