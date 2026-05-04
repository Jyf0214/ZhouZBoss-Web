import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

/**
 * 检测数据库是否可用
 * 通过环境变量判断，不实际连接数据库
 */
export function hasDatabase(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

/** 站点基础配置 */
export interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

/** 外观配置 */
export interface AppearanceConfig {
  background: {
    url: string;
    opacity: number;
  };
  customCSS: string;
  customHead: string;
}

/** 访问控制配置 */
export interface AccessConfig {
  posts: {
    public: string[];
    private: string[];
  };
  faces: {
    public: string[];
    private: string[];
  };
}

/** 认证配置 */
export interface AuthConfig {
  /** 是否允许新用户注册 */
  allowRegistration: boolean;
}

/** 完整应用配置 */
export interface AppConfig {
  site: SiteConfig;
  appearance: AppearanceConfig;
  access: AccessConfig;
  auth: AuthConfig;
}

/** 默认配置（config.json 不存在时使用） */
const defaultConfig: AppConfig = {
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
  },
  access: {
    posts: { public: ['*'], private: [] },
    faces: { public: [], private: ['*'] },
  },
  auth: {
    allowRegistration: true,
  },
};

/** 缓存已加载的配置（仅同步加载时使用） */
let cachedConfig: AppConfig | null = null;

/**
 * 从项目根目录同步加载 config.json
 * 仅用于构建时或无数据库的场景
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedConfig = {
        site: { ...defaultConfig.site, ...parsed.site },
        appearance: {
          background: { ...defaultConfig.appearance.background, ...parsed.appearance?.background },
          customCSS: parsed.appearance?.customCSS ?? defaultConfig.appearance.customCSS,
          customHead: parsed.appearance?.customHead ?? defaultConfig.appearance.customHead,
        },
        access: { ...defaultConfig.access, ...parsed.access },
        auth: {
          allowRegistration: parsed.auth?.allowRegistration ?? defaultConfig.auth.allowRegistration,
        },
      };
    } else {
      cachedConfig = { ...defaultConfig };
    }
  } catch {
    cachedConfig = { ...defaultConfig };
  }
  return cachedConfig;
}

/**
 * 异步加载配置，优先级：数据库 > config.json > 默认值
 * 运行时使用此方法，确保管理员修改的配置能实时生效
 */
export async function loadConfigAsync(): Promise<AppConfig> {
  // 基础配置从 config.json 读取
  const fileConfig = loadConfig();

  // 无数据库时直接返回文件配置
  if (!hasDatabase()) return fileConfig;

  try {
    const db = getDb();
    const dbRaw = await db.get('config:main');
    if (!dbRaw) return fileConfig;

    const dbConfig = JSON.parse(dbRaw);

    // 将数据库的扁平结构映射到嵌套的 AppConfig
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
  } catch {
    return fileConfig;
  }
}

/**
 * 将 AppConfig 保存到数据库
 * 管理员修改配置时调用
 */
export async function saveConfigToDb(config: AppConfig): Promise<void> {
  if (!hasDatabase()) return;
  const db = getDb();
  // 存储为兼容的扁平+嵌套混合结构
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
  // 清除同步缓存，下次 loadConfig 会重新读取
  cachedConfig = null;
}

/**
 * 判断路径是否匹配脱字符模式
 * 支持通配符：* 匹配任意字符，^ 匹配路径前缀
 *
 * 示例：
 * "*" → 匹配所有路径
 * "^/daily" → 匹配 /daily、/daily/xxx 等前缀路径
 * "/about" → 精确匹配 /about
 */
export function matchPath(pattern: string, target: string): boolean {
  if (pattern === '*') return true;
  // 脱字符前缀匹配
  if (pattern.startsWith('^')) {
    const prefix = pattern.slice(1);
    return target === prefix || target.startsWith(prefix + '/');
  }
  // 精确匹配
  return target === pattern;
}

/**
 * 判断指定路径的内容是否可被某角色访问
 * @param section 内容分区：posts 或 faces
 * @param slug 内容路径（如 /daily/2024-01）
 * @param isAuthenticated 用户是否已登录
 * @param hasDatabase 是否有数据库（无数据库时私有内容直接省略）
 * @param config 可选的配置对象，不传则使用 loadConfig()
 */
export function canAccess(
  section: 'posts' | 'faces',
  slug: string,
  isAuthenticated: boolean,
  hasDatabase: boolean = false,
  config?: AppConfig,
): boolean {
  const rules = (config || loadConfig()).access[section];

  // 检查是否命中私有规则
  const isPrivate = rules.private.some((p) => matchPath(p, slug));
  // 检查是否命中公开规则
  const isPublic = rules.public.some((p) => matchPath(p, slug));

  // 无数据库时，私有内容直接省略（无认证方式）
  if (isPrivate && !hasDatabase) return false;
  // 私有内容需要登录且有数据库
  if (isPrivate && hasDatabase) return isAuthenticated;
  // 显式公开
  if (isPublic) return true;
  // 未匹配任何规则时，默认需要登录
  return isAuthenticated;
}

/**
 * 获取指定分区下所有可访问的路径
 * 用于构建时生成静态页面列表
 * 无数据库时，私有内容直接从列表中省略
 */
export function filterAccessibleSlugs(
  section: 'posts' | 'faces',
  slugs: string[],
  hasDatabase: boolean = false,
): string[] {
  return slugs.filter((slug) => canAccess(section, slug, false, hasDatabase));
}
