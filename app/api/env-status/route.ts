import { NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/env-status');

/**
 * 环境变量状态检查 API
 * 仅管理员可访问
 *
 * 每个变量返回 descriptionKey（i18n 键），由前端 useI18n 解析，
 * 避免在服务端硬编码双语文案。
 */
export const GET = apiHandler('GET', { label: '获取环境变量状态', requireAdmin: true }, () => {
  logger.info('GET', '获取环境变量状态');

  const envStatus = {
    database: {
      name: '数据库',
      nameKey: 'env.groups.database',
      descriptionKey: 'env.groups.database.desc',
      variables: [
        {
          name: 'DATABASE_URL',
          isSet: !!process.env.DATABASE_URL,
          required: true,
          descriptionKey: 'env.vars.database.DATABASE_URL',
        },
        {
          name: 'POSTGRES_URL',
          isSet: !!process.env.POSTGRES_URL,
          required: false,
          descriptionKey: 'env.vars.database.POSTGRES_URL',
        },
        {
          name: 'POSTGRES_PRISMA_URL',
          isSet: !!process.env.POSTGRES_PRISMA_URL,
          required: false,
          descriptionKey: 'env.vars.database.POSTGRES_PRISMA_URL',
        },
        {
          name: 'POSTGRES_URL_NON_POOLING',
          isSet: !!process.env.POSTGRES_URL_NON_POOLING,
          required: false,
          descriptionKey: 'env.vars.database.POSTGRES_URL_NON_POOLING',
        },
      ],
    },
    auth: {
      name: '认证',
      nameKey: 'env.groups.auth',
      descriptionKey: 'env.groups.auth.desc',
      variables: [
        {
          name: 'AUTH_SECRET',
          isSet: !!process.env.AUTH_SECRET,
          required: true,
          descriptionKey: 'env.vars.auth.AUTH_SECRET',
        },
      ],
    },
    admin: {
      name: '管理员账户',
      nameKey: 'env.groups.admin',
      descriptionKey: 'env.groups.admin.desc',
      variables: [
        {
          name: 'ADMIN_EMAIL',
          isSet: !!process.env.ADMIN_EMAIL,
          required: false,
          descriptionKey: 'env.vars.admin.ADMIN_EMAIL',
        },
        {
          name: 'ADMIN_PASSWORD',
          isSet: !!process.env.ADMIN_PASSWORD,
          required: false,
          descriptionKey: 'env.vars.admin.ADMIN_PASSWORD',
        },
      ],
    },
    app: {
      name: '应用 URL',
      nameKey: 'env.groups.app',
      descriptionKey: 'env.groups.app.desc',
      variables: [
        {
          name: 'APP_URL',
          isSet: !!process.env.APP_URL,
          required: false,
          descriptionKey: 'env.vars.app.APP_URL',
        },
        {
          name: 'NEXT_PUBLIC_SITE_URL',
          isSet: !!process.env.NEXT_PUBLIC_SITE_URL,
          required: false,
          descriptionKey: 'env.vars.app.NEXT_PUBLIC_SITE_URL',
          deprecated: true,
          renamedTo: 'APP_URL',
        },
      ],
    },
    github: {
      name: 'GitHub 同步',
      nameKey: 'env.groups.github',
      descriptionKey: 'env.groups.github.desc',
      variables: [
        {
          name: 'GITHUB_REPO',
          isSet: !!process.env.GITHUB_REPO,
          required: false,
          descriptionKey: 'env.vars.github.GITHUB_REPO',
        },
        {
          name: 'GITHUB_TOKEN',
          isSet: !!process.env.GITHUB_TOKEN,
          required: false,
          descriptionKey: 'env.vars.github.GITHUB_TOKEN',
        },
        {
          name: 'NEXT_PUBLIC_GITHUB_REPO',
          isSet: !!process.env.NEXT_PUBLIC_GITHUB_REPO,
          required: false,
          descriptionKey: 'env.vars.github.NEXT_PUBLIC_GITHUB_REPO',
        },
      ],
    },
    giscus: {
      name: 'Giscus 评论',
      nameKey: 'env.groups.giscus',
      descriptionKey: 'env.groups.giscus.desc',
      variables: [
        {
          name: 'NEXT_PUBLIC_GISCUS_REPO',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_REPO,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_REPO',
        },
        {
          name: 'NEXT_PUBLIC_GISCUS_REPO_ID',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_REPO_ID',
        },
        {
          name: 'NEXT_PUBLIC_GISCUS_CATEGORY',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_CATEGORY',
        },
        {
          name: 'NEXT_PUBLIC_GISCUS_CATEGORY_ID',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_CATEGORY_ID',
        },
      ],
    },
    storage: {
      name: '存储池 (WebDAV)',
      nameKey: 'env.groups.storage',
      descriptionKey: 'env.groups.storage.desc',
      variables: [
        {
          name: 'WEBDAV_URL',
          isSet: !!process.env.WEBDAV_URL,
          required: false,
          descriptionKey: 'env.vars.storage.WEBDAV_URL',
        },
        {
          name: 'WEBDAV_USER',
          isSet: !!process.env.WEBDAV_USER,
          required: false,
          descriptionKey: 'env.vars.storage.WEBDAV_USER',
        },
        {
          name: 'WEBDAV_PASS',
          isSet: !!process.env.WEBDAV_PASS,
          required: false,
          descriptionKey: 'env.vars.storage.WEBDAV_PASS',
        },
      ],
    },
    smtp: {
      name: 'SMTP 邮件服务',
      nameKey: 'env.groups.smtp',
      descriptionKey: 'env.groups.smtp.desc',
      variables: [
        {
          name: 'SMTP_HOST',
          isSet: !!process.env.SMTP_HOST,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_HOST',
        },
        {
          name: 'SMTP_PORT',
          isSet: !!process.env.SMTP_PORT,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_PORT',
        },
        {
          name: 'SMTP_USER',
          isSet: !!process.env.SMTP_USER,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_USER',
        },
        {
          name: 'SMTP_PASS',
          isSet: !!process.env.SMTP_PASS,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_PASS',
        },
        {
          name: 'SMTP_FROM',
          isSet: !!process.env.SMTP_FROM,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_FROM',
        },
        {
          name: 'SMTP_SECURE',
          isSet: !!process.env.SMTP_SECURE,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_SECURE',
        },
      ],
    },
    cron: {
      name: '定时任务',
      nameKey: 'env.groups.cron',
      descriptionKey: 'env.groups.cron.desc',
      variables: [
        {
          name: 'CRON_SECRET',
          isSet: !!process.env.CRON_SECRET,
          required: false,
          descriptionKey: 'env.vars.cron.CRON_SECRET',
        },
      ],
    },
    clerk: {
      name: 'Clerk 第三方登录',
      nameKey: 'env.groups.clerk',
      descriptionKey: 'env.groups.clerk.desc',
      variables: [
        {
          name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
          isSet: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          required: false,
          descriptionKey: 'env.vars.clerk.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        },
        {
          name: 'CLERK_SECRET_KEY',
          isSet: !!process.env.CLERK_SECRET_KEY,
          required: false,
          descriptionKey: 'env.vars.clerk.CLERK_SECRET_KEY',
        },
        {
          name: 'CLERK_WEBHOOK_SECRET',
          isSet: !!process.env.CLERK_WEBHOOK_SECRET,
          required: false,
          descriptionKey: 'env.vars.clerk.CLERK_WEBHOOK_SECRET',
        },
      ],
    },
    system: {
      name: '系统 / 构建',
      nameKey: 'env.groups.system',
      descriptionKey: 'env.groups.system.desc',
      variables: [
        {
          name: 'SKIP_DB_INIT',
          isSet: !!process.env.SKIP_DB_INIT,
          required: false,
          descriptionKey: 'env.vars.system.SKIP_DB_INIT',
        },
        {
          name: 'DISABLE_HMR',
          isSet: !!process.env.DISABLE_HMR,
          required: false,
          descriptionKey: 'env.vars.system.DISABLE_HMR',
        },
        {
          name: 'NODE_ENV',
          isSet: !!process.env.NODE_ENV,
          required: false,
          descriptionKey: 'env.vars.system.NODE_ENV',
          systemInjected: true,
        },
        {
          name: 'VERCEL',
          isSet: !!process.env.VERCEL,
          required: false,
          descriptionKey: 'env.vars.system.VERCEL',
          systemInjected: true,
        },
        {
          name: 'VERCEL_URL',
          isSet: !!process.env.VERCEL_URL,
          required: false,
          descriptionKey: 'env.vars.system.VERCEL_URL',
          systemInjected: true,
        },
        {
          name: 'VERCEL_PROJECT_PRODUCTION_URL',
          isSet: !!process.env.VERCEL_PROJECT_PRODUCTION_URL,
          required: false,
          descriptionKey: 'env.vars.system.VERCEL_PROJECT_PRODUCTION_URL',
          systemInjected: true,
        },
      ],
    },
  };

  // 计算统计
  const allVars = Object.values(envStatus).flatMap((g) => g.variables);
  const requiredVars = allVars.filter((v) => v.required);
  const optionalVars = allVars.filter((v) => !v.required);
  const setVars = allVars.filter((v) => v.isSet);
  const missingRequired = requiredVars.filter((v) => !v.isSet);

  // 自定义 isReady:DB 组要求至少一个连接变量被设置(AUTH_SECRET 已在 required 中)
  const dbVars = envStatus.database.variables;
  const dbReady = dbVars.some((v) => v.isSet);
  const isReady = missingRequired.length === 0 && dbReady;

  // 如果 DB 组全部未设置,把 DATABASE_URL 加入 missing 列表
  const finalMissingRequired = [...missingRequired.map((v) => v.name)];
  if (!dbReady) {
    finalMissingRequired.push('DATABASE_URL');
  }

  logger.info('GET', '环境变量状态获取成功', { isReady, total: allVars.length, set: setVars.length });
  return NextResponse.json({
    groups: envStatus,
    summary: {
      total: allVars.length,
      set: setVars.length,
      required: requiredVars.length,
      requiredSet: requiredVars.filter((v) => v.isSet).length,
      optional: optionalVars.length,
      optionalSet: optionalVars.filter((v) => v.isSet).length,
      missingRequired: finalMissingRequired,
      isReady,
    },
  });
});
