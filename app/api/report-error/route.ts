/**
 * 客户端错误上报 API
 * 用于前端 showError 等场景把错误回传到管理员邮箱。
 * 匿名开放，按客户端 IP 做速率限制。
 */

import { type NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { sendMail } from '@/lib/mail';

const logger = createApiLogger('/api/report-error');

// === 字段长度上限 ===
const MAX_MESSAGE = 500;
const MAX_STACK = 5000;
const MAX_ENDPOINT = 200;
const MAX_REQUEST_ID = 100;
const MAX_USER_AGENT = 500;
const MAX_URL = 500;
const MAX_DETAILS_BYTES = 5 * 1024;

// === 速率限制：每 IP 每小时 5 次 ===
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

/** 清理过期条目，防止 map 无限增长 */
function pruneRateLimitMap(): void {
  if (rateLimitMap.size <= 1000) return;
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of rateLimitMap) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recent);
    }
  }
}

// 业务字段联合类型
const STRING_FIELDS = ['stack', 'endpoint', 'requestId', 'userAgent', 'url'] as const;
type StringField = (typeof STRING_FIELDS)[number];

const STRING_FIELD_MAX: Record<StringField, number> = {
  stack: MAX_STACK,
  endpoint: MAX_ENDPOINT,
  requestId: MAX_REQUEST_ID,
  userAgent: MAX_USER_AGENT,
  url: MAX_URL,
};

interface RawReport {
  message?: unknown;
  stack?: unknown;
  endpoint?: unknown;
  requestId?: unknown;
  userAgent?: unknown;
  url?: unknown;
  details?: unknown;
}

interface ValidatedReport {
  message: string;
  stack?: string;
  endpoint?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  details?: Record<string, unknown>;
}

type FieldCheck = { ok: true; value?: string } | { ok: false; error: string };
type DetailsCheck = { ok: true; value?: Record<string, unknown> } | { ok: false; error: string };
type ValidationResult = { ok: true; report: ValidatedReport } | { ok: false; error: string };

/**
 * 校验单个可选字符串字段。undefined 表示字段未提供。
 */
function checkStringField(value: unknown, max: number, field: StringField): FieldCheck {
  if (value === undefined) return { ok: true };
  if (typeof value !== 'string') {
    return { ok: false, error: `${field} 必须是字符串` };
  }
  if (value.length === 0) {
    return { ok: false, error: `${field} 不能为空` };
  }
  if (value.length > max) {
    return { ok: false, error: `${field} 长度超出限制` };
  }
  return { ok: true, value };
}

/**
 * 校验 details 字段：必须是普通对象，序列化后体积 ≤ 5KB。
 */
function checkDetails(value: unknown): DetailsCheck {
  if (value === undefined) return { ok: true };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'details 必须是对象' };
  }
  if (JSON.stringify(value).length > MAX_DETAILS_BYTES) {
    return { ok: false, error: 'details 体积超出限制' };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

/**
 * 校验并规范化上报 body。
 */
function validateReport(raw: RawReport): ValidationResult {
  if (
    typeof raw.message !== 'string' ||
    raw.message.trim() === '' ||
    raw.message.length > MAX_MESSAGE
  ) {
    return { ok: false, error: '消息内容不能为空' };
  }

  const report: ValidatedReport = { message: raw.message };
  for (const field of STRING_FIELDS) {
    const result = checkStringField(raw[field], STRING_FIELD_MAX[field], field);
    if (!result.ok) return { ok: false, error: result.error };
    if (result.value !== undefined) {
      report[field] = result.value;
    }
  }

  const detailsResult = checkDetails(raw.details);
  if (!detailsResult.ok) return { ok: false, error: detailsResult.error };
  if (detailsResult.value !== undefined) {
    report.details = detailsResult.value;
  }

  return { ok: true, report };
}

/**
 * 按 IP 做滑窗速率限制。返回 true 表示已放行并消耗一次配额，false 表示受限。
 */
function consumeRateLimitToken(ip: string): boolean {
  pruneRateLimitMap();
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateLimitMap.get(ip) ?? []).filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

/**
 * 提取客户端 IP。优先取 x-forwarded-for 第一项，回退 x-real-ip。
 */
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  return xff?.split(',')?.[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * 转义 HTML 特殊字符，用于在 <pre> 中安全渲染用户内容。
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 构造 Markdown 报告并包到 <pre> 中，便于在邮件里直接阅读源码。
 */
function buildReportHtml(
  report: ValidatedReport,
  ip: string,
  receivedAt: string,
): string {
  const lines: string[] = [];
  lines.push('# Originium Error Report');
  lines.push('');
  lines.push(`- Received At: ${receivedAt}`);
  lines.push(`- IP: ${ip}`);
  if (report.requestId) lines.push(`- Request ID: ${report.requestId}`);
  if (report.endpoint) lines.push(`- Endpoint: ${report.endpoint}`);
  if (report.url) lines.push(`- Page URL: ${report.url}`);
  if (report.userAgent) lines.push(`- User-Agent: ${report.userAgent}`);
  lines.push('');
  lines.push('## Message');
  lines.push('');
  lines.push('```');
  lines.push(report.message);
  lines.push('```');
  if (report.stack) {
    lines.push('');
    lines.push('## Stack');
    lines.push('');
    lines.push('```');
    lines.push(report.stack);
    lines.push('```');
  }
  if (report.details && Object.keys(report.details).length > 0) {
    lines.push('');
    lines.push('## Details');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(report.details, null, 2));
    lines.push('```');
  }
  const markdown = lines.join('\n');
  return (
    '<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' +
    'font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;' +
    'background:#f5f5f5;padding:16px;border-radius:8px;border:1px solid #e5e5e5">' +
    escapeHtml(markdown) +
    '</pre>'
  );
}

async function handleReport(req: NextRequest): Promise<NextResponse> {
  let raw: RawReport;
  try {
    raw = (await req.json()) as RawReport;
  } catch {
    logger.warn('POST', 'invalid JSON body');
    return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
  }

  const result = validateReport(raw);
  if (!result.ok) {
    logger.warn('POST', 'validation failed', { error: result.error });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const report = result.report;
  const ip = getClientIp(req);

  if (!consumeRateLimitToken(ip)) {
    logger.warn('POST', 'rate limited', { ip, requestId: report.requestId });
    return NextResponse.json({ success: true });
  }

  logger.info('POST', 'error report received', {
    requestId: report.requestId,
    endpoint: report.endpoint,
    url: report.url,
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn('POST', 'ADMIN_EMAIL 未配置，跳过邮件上报', {
      requestId: report.requestId,
    });
    return NextResponse.json({ success: true });
  }

  const receivedAt = new Date().toISOString();
  const subject = `[Originium Error] ${report.message.slice(0, 80)}`;
  const html = buildReportHtml(report, ip, receivedAt);

  try {
    const sent = await sendMail({ to: adminEmail, subject, html });
    if (!sent) {
      logger.warn('POST', 'sendMail 返回 false', { requestId: report.requestId });
    }
  } catch (mailErr) {
    logger.error('POST', 'sendMail 抛出异常', {
      error: mailErr instanceof Error ? mailErr.message : String(mailErr),
      requestId: report.requestId,
    });
  }

  return NextResponse.json({ success: true });
}

export const POST = apiHandler('POST', { label: '错误上报' }, handleReport);
