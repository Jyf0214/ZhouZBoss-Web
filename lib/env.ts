/**
 * Environment Variable Validation for Originium Kernel
 * 延迟验证，只在实际使用时检查
 */

export interface EnvConfig {
  databaseUrl: string;
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
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';

  const authSecret = process.env.AUTH_SECRET || 'fallback-secret-at-least-32-chars-long';
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
    errors.push('DATABASE_URL is required');
  }

  if (!config.authSecret || config.authSecret === 'fallback-secret-at-least-32-chars-long') {
    if (process.env.NODE_ENV === 'production') {
      errors.push('AUTH_SECRET is required');
    }
  }

  if (process.env.NODE_ENV === 'production' && errors.length > 0) {
    console.warn('⚠️ 环境变量警告:', errors.join(', '));
  }

  return config;
}

/**
 * Check if GitHub integration is configured
 */
export function isGitHubConfigured(): boolean {
  const config = getEnvConfig();
  return !!(config.githubRepo && config.githubToken);
}

/**
 * Check if cron jobs are enabled
 */
export function isCronEnabled(): boolean {
  const config = getEnvConfig();
  return !!config.cronSecret;
}
