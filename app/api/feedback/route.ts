/**
 * 反馈提交 API
 * 将访客提交的反馈/建议/Bug 报告自动创建为 GitHub Issue。
 * 匿名开放，按客户端 IP 做速率限制。
 */

import { type NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const logger = createApiLogger('/api/feedback');

// === 分类白名单 ===
const CATEGORIES = ['bug', 'feature', 'feedback'] as const;
type Category = (typeof CATEGORIES)[number];

// === 字段长度上限 ===
const MAX_TITLE = 200;
const MAX_BODY = 5000;

// === 速率限制：每 IP 每小时 10 次 ===
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

/** IP 脱敏：保留前两段，其余替换为 * */
function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length !== 4) return '***';
  return `${parts[0]}.${parts[1]}.*.*`;
}

/** 校验并规范化请求 body */
function validateBody(raw: unknown): { ok: true; title: string; body: string; category: Category } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: '请求体必须是 JSON 对象' };
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    return { ok: false, error: '标题不能为空' };
  }
  if (obj.title.length > MAX_TITLE) {
    return { ok: false, error: `标题长度不能超过 ${MAX_TITLE} 字符` };
  }

  if (typeof obj.body !== 'string' || obj.body.trim().length === 0) {
    return { ok: false, error: '内容不能为空' };
  }
  if (obj.body.length > MAX_BODY) {
    return { ok: false, error: `内容长度不能超过 ${MAX_BODY} 字符` };
  }

  const category = CATEGORIES.includes(obj.category as Category)
    ? (obj.category as Category)
    : 'feedback';

  return {
    ok: true,
    title: obj.title.trim(),
    body: obj.body.trim(),
    category,
  };
}

/**
 * 构造 GitHub Issue 的 Markdown body
 */
function buildIssueBody(
  content: string,
  ip: string,
  userAgent: string,
): string {
  const lines: string[] = [];
  lines.push(content);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**提交时间**: ${new Date().toISOString()}`);
  lines.push(`**IP (脱敏)**: ${ip}`);
  lines.push(`**User-Agent**: ${userAgent.slice(0, 200)}`);
  return lines.join('\n');
}

async function handleFeedback(req: NextRequest): Promise<NextResponse> {
  // 速率限制
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = rateLimit(`${ip}:feedback`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    logger.warn('POST', 'rate limited', { ip: maskIp(ip) });
    return NextResponse.json(
      { error: `提交过于频繁，请 ${retryAfterSec} 秒后重试` },
      { status: 429 },
    );
  }

  // 解析 body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    logger.warn('POST', 'invalid JSON body');
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const result = validateBody(raw);
  if (!result.ok) {
    logger.warn('POST', 'validation failed', { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 读取 GitHub 配置
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    logger.error('POST', 'GITHUB_REPO 或 GITHUB_TOKEN 未配置');
    return NextResponse.json({ error: '反馈服务暂不可用' }, { status: 503 });
  }

  // 构造 Issue
  const [owner = '', repoName = ''] = repo.split('/');
  const issueTitle = `[Feedback][${result.category}] ${result.title}`;
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const issueBody = buildIssueBody(result.body, ip, userAgent);

  try {
    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.issues.create({
      owner,
      repo: repoName,
      title: issueTitle,
      body: issueBody,
      labels: [`feedback:${result.category}`],
    });

    logger.info('POST', 'issue created', {
      issueNumber: data.number,
      category: result.category,
      ip: maskIp(ip),
    });

    return NextResponse.json({ success: true, issueNumber: data.number });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('POST', '创建 Issue 失败', { error: message });
    return NextResponse.json({ error: '提交失败，请稍后重试' }, { status: 500 });
  }
}

export const POST = apiHandler('POST', { label: '反馈提交' }, handleFeedback);
