import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/**
 * 环境变量状态检查 API
 * 仅管理员可访问
 */
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const envStatus = {
    database: {
      name: '数据库',
      variables: [
        {
          name: 'DATABASE_URL / POSTGRES_URL',
          isSet: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING),
          required: true,
          description: 'PostgreSQL 数据库连接地址',
        },
      ],
    },
    auth: {
      name: '认证',
      variables: [
        {
          name: 'AUTH_SECRET',
          isSet: !!process.env.AUTH_SECRET,
          required: true,
          description: 'JWT 签名密钥',
        },
      ],
    },
    clerk: {
      name: 'Clerk 第三方登录',
      variables: [
        {
          name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
          isSet: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          required: false,
          description: 'Clerk 公钥（前端可见）',
        },
        {
          name: 'CLERK_SECRET_KEY',
          isSet: !!process.env.CLERK_SECRET_KEY,
          required: false,
          description: 'Clerk 密钥（后端 API 用）',
        },
        {
          name: 'CLERK_WEBHOOK_SECRET',
          isSet: !!process.env.CLERK_WEBHOOK_SECRET,
          required: false,
          description: 'Clerk Webhook 签名验证密钥',
        },
      ],
    },
    smtp: {
      name: 'SMTP 邮件服务',
      variables: [
        {
          name: 'SMTP_HOST',
          isSet: !!process.env.SMTP_HOST,
          required: false,
          description: 'SMTP 服务器地址（如 smtp.gmail.com）',
        },
        {
          name: 'SMTP_PORT',
          isSet: !!process.env.SMTP_PORT,
          required: false,
          description: 'SMTP 端口（587/465/25）',
        },
        {
          name: 'SMTP_USER',
          isSet: !!process.env.SMTP_USER,
          required: false,
          description: 'SMTP 登录用户名',
        },
        {
          name: 'SMTP_PASS',
          isSet: !!process.env.SMTP_PASS,
          required: false,
          description: 'SMTP 登录密码或应用专用密码',
        },
      ],
    },
    github: {
      name: 'GitHub 同步',
      variables: [
        {
          name: 'GITHUB_REPO',
          isSet: !!process.env.GITHUB_REPO,
          required: false,
          description: 'GitHub 仓库（格式：用户名/仓库名）',
        },
        {
          name: 'GITHUB_TOKEN',
          isSet: !!process.env.GITHUB_TOKEN,
          required: false,
          description: 'GitHub 访问令牌（需要 repo 权限）',
        },
      ],
    },
  };

  // 计算统计
  const allVars = Object.values(envStatus).flatMap(g => g.variables);
  const requiredVars = allVars.filter(v => v.required);
  const optionalVars = allVars.filter(v => !v.required);
  const setVars = allVars.filter(v => v.isSet);
  const missingRequired = requiredVars.filter(v => !v.isSet);

  return NextResponse.json({
    groups: envStatus,
    summary: {
      total: allVars.length,
      set: setVars.length,
      required: requiredVars.length,
      requiredSet: requiredVars.filter(v => v.isSet).length,
      optional: optionalVars.length,
      optionalSet: optionalVars.filter(v => v.isSet).length,
      missingRequired: missingRequired.map(v => v.name),
      isReady: missingRequired.length === 0,
    },
  });
}
