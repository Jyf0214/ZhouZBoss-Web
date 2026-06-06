/**
 * Originium Kernel 环境变量验证
 * 延迟验证，只在实际使用时检查
 */

export interface EnvConfig {
  databaseUrl: string | undefined;
  authSecret: string;
  appUrl?: string;
  githubRepo?: string;
  githubToken?: string;
  cronSecret?: string;
}

/**
 * 获取环境变量（不验证，构建时可用）
 */
export function getEnvConfig(): EnvConfig {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  const authSecret = process.env.AUTH_SECRET ?? '';
  const appUrl = process.env.APP_URL;
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const cronSecret = process.env.CRON_SECRET;

  return {
    databaseUrl,
    authSecret,
    appUrl,
    githubRepo,
    githubToken,
    cronSecret,
  };
}

/**
 * 验证环境变量（运行时调用）
 */
export function validateEnv(): EnvConfig {
  const config = getEnvConfig();
  const errors: string[] = [];

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL 为必填项');
  }

  if (!config.authSecret) {
    errors.push('AUTH_SECRET 为必填项');
  }

  if (process.env.NODE_ENV === 'production' && errors.length > 0) {
    console.warn('⚠️ 环境变量警告:', errors.join(', '));
  }

  return config;
}

/**
 * 检查 GitHub 集成是否已配置
 */
export function isGitHubConfigured(): boolean {
  const config = getEnvConfig();
  return !!(config.githubRepo && config.githubToken);
}

/**
 * 检查定时任务是否启用
 */
export function isCronEnabled(): boolean {
  const config = getEnvConfig();
  return !!config.cronSecret;
}

/**
 * 检测 WebDAV 存储池是否已配置
 * - 全部三个环境变量都存在才返回 true
 * - 部分缺失视为未配置(失败安全)
 */
export function isWebDavConfigured(): boolean {
  const url = process.env.WEBDAV_URL;
  const user = process.env.WEBDAV_USER;
  const pass = process.env.WEBDAV_PASS;
  return !!(url && user && pass);
}
