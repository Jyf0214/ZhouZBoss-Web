/**
 * Environment Variable Validation for Originium Kernel
 * Ensures all required environment variables are present in production
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
 * Validate and get environment variables
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Required in production
  const databaseUrl = process.env.DATABASE_URL;
  const authSecret = process.env.AUTH_SECRET;

  if (!databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  if (!authSecret) {
    errors.push('AUTH_SECRET is required');
  } else if (authSecret.length < 32) {
    errors.push('AUTH_SECRET must be at least 32 characters long');
  }

  // Optional but recommended
  const appUrl = process.env.APP_URL;
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && errors.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${errors.join('\n')}`
    );
  }

  if (errors.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('Environment validation warnings:', errors);
  }

  return {
    databaseUrl: databaseUrl || 'redis://localhost:6379',
    authSecret: authSecret || 'fallback-secret-at-least-32-chars-long',
    appUrl,
    githubRepo,
    githubToken,
    cronSecret,
  };
}

/**
 * Get validated environment config (cached)
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
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
