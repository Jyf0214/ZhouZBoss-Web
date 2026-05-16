import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getDb } from '@/lib/db';
import type { AppConfig, SiteConfig, AppearanceConfig, AccessConfig, AuthConfig, UserConfig } from '@/next.config';

export type { AppConfig, SiteConfig, AppearanceConfig, AccessConfig, AuthConfig, UserConfig };

/**
 * 检测数据库是否可用
 */
export function hasDatabase(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

/**
 * 从 config.yaml 加载配置
 */
function loadConfigFromYaml(): AppConfig {
  const configPath = path.join(process.cwd(), 'config.yaml');
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = yaml.load(fileContent) as AppConfig;
    return parsed;
  } catch (error) {
    console.error('config.yaml 加载失败:', error);
    return getDefaultConfig();
  }
}

/**
 * 默认配置
 */
function getDefaultConfig(): AppConfig {
  return {
    site: {
      title: 'Originium Kernel',
      description: '现代内容发布平台',
      heroTitleLine1: '书写。同步。',
      heroTitleLine2: '部署。',
      lang: 'zh-CN',
    },
    appearance: {
      background: { url: '', opacity: 0.8 },
      customCSS: '',
      customHead: '',
      loading: {
        page: { type: 'waves', color: '#c084fc', position: 'center' },
        navigation: { type: 'antd', color: '#c084fc' },
      },
    },
    access: {
      posts: { public: ['*'], private: [] },
      faces: { public: [], private: ['*'] },
      diary: { public: [], private: ['*'] },
    },
    auth: {
      allowRegistration: true,
    },
  };
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
 * 异步加载配置，优先级：数据库 > config.yaml > 默认值
 */
export async function loadConfigAsync(): Promise<AppConfig> {
  const fileConfig = loadConfig();

  if (!hasDatabase()) return fileConfig;

  try {
    const db = getDb();
    const dbRaw = await db.get('config:main');
    if (!dbRaw) return fileConfig;

    const dbConfig = JSON.parse(dbRaw);

    return {
      site: {
        title: dbConfig.siteTitle ?? fileConfig.site.title,
        description: dbConfig.siteDescription ?? fileConfig.site.description,
        heroTitleLine1: dbConfig.heroTitleLine1 ?? fileConfig.site.heroTitleLine1,
        heroTitleLine2: dbConfig.heroTitleLine2 ?? fileConfig.site.heroTitleLine2,
        lang: fileConfig.site.lang,
      },
      appearance: {
        background: dbConfig.background
          ? { ...fileConfig.appearance.background, ...dbConfig.background }
          : fileConfig.appearance.background,
        customCSS: dbConfig.customCSS ?? fileConfig.appearance.customCSS,
        customHead: dbConfig.customHead ?? fileConfig.appearance.customHead,
      },
      access: dbConfig.access ? { ...fileConfig.access, ...dbConfig.access } : fileConfig.access,
      auth: dbConfig.auth ? { ...fileConfig.auth, ...dbConfig.auth } : fileConfig.auth,
    };
  } catch (error) {
    console.error('数据库配置加载失败:', error);
    return fileConfig;
  }
}

/**
 * 将配置保存到数据库
 */
export async function saveConfigToDb(config: AppConfig): Promise<void> {
  if (!hasDatabase()) return;
  const db = getDb();
  const dbData = {
    siteTitle: config.site.title,
    siteDescription: config.site.description,
    heroTitleLine1: config.site.heroTitleLine1,
    heroTitleLine2: config.site.heroTitleLine2,
    background: config.appearance.background,
    customCSS: config.appearance.customCSS,
    customHead: config.appearance.customHead,
    access: config.access,
    auth: config.auth,
  };
  await db.set('config:main', JSON.stringify(dbData));
  cachedConfig = null;
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
  hasDb: boolean = false,
  config?: AppConfig,
): boolean {
  const rules = (config || loadConfig()).access[section];

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
  hasDb: boolean = false,
): string[] {
  return slugs.filter((slug) => canAccess(section, slug, false, hasDb));
}

/**
 * 获取用户头像（仅从配置文件读取）
 * 优先级：config.users[uid].avatar > auth.admin.avatar（仅当用户是管理员）
 */
export async function getUserAvatarAsync(uid: string, isAdmin?: boolean): Promise<string | null> {
  const config = loadConfig();

  if (config.users?.[uid]?.avatar) {
    return config.users[uid].avatar;
  }

  if (isAdmin && config.auth?.admin?.avatar) {
    return config.auth.admin.avatar;
  }

  return null;
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

/**
 * 保存用户头像（已禁用，头像仅从配置文件读取）
 */
export async function saveUserAvatar(): Promise<void> {
  // 头像现在仅从配置文件读取，此函数已禁用
}
