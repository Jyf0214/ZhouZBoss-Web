/**
 * 自定义页面元数据 API
 * /api/page/meta/[...path]
 *
 * GET — 读取 meta.json（公开）
 * PUT — 写入/更新 meta.json（仅 sudo）
 * DELETE — 删除 meta.json（仅 sudo）
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { buildPageRelativePath, type PageMeta } from '@/lib/page-source/shared'
import { isStorageConfigured } from '@/lib/storage/storage-provider'
import { fetchPageMeta, putPageMeta, deletePageMeta } from '@/lib/page-source/webdav'

/** 从请求参数提取相对路径 */
async function resolveRelativePath(ctx: { params: Promise<Record<string, unknown>> } | undefined): Promise<string | null> {
  const params = (await (ctx?.params ?? Promise.resolve({} as Record<string, unknown>)));
  const raw = params.path;
  const segments: string[] = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : typeof raw === 'string' ? [raw] : [];
  return buildPageRelativePath(segments);
}

/** 从请求体校验并提取白名单字段 */
function parseMetaBody(body: unknown): { meta: PageMeta } | { error: string } {
  if (!body || typeof body !== 'object') return { error: '请求体不能为空' };
  const input = body as Record<string, unknown>;
  const meta: PageMeta = {};
  const stringChecks: [string, string][] = [
    ['title', 'title 必须是字符串'],
    ['description', 'description 必须是字符串'],
    ['coverImage', 'coverImage 必须是字符串'],
  ];
  for (const [key, msg] of stringChecks) {
    const val = input[key];
    if (val !== undefined) {
      if (typeof val !== 'string') return { error: msg };
      (meta as Record<string, unknown>)[key] = val;
    }
  }
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || !input.tags.every((t): t is string => typeof t === 'string')) {
      return { error: 'tags 必须是字符串数组' };
    }
    meta.tags = [...new Set(input.tags.map(t => t.trim()).filter(t => t.length > 0 && t.length <= 50))].slice(0, 20);
  }
  return { meta };
}

export const GET = apiHandler('GET', { label: 'page-meta.get' }, async (_req, ctx) => {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: '存储后端未配置', code: 'NOT_CONFIGURED' }, { status: 503 });
  }
  const relativePath = await resolveRelativePath(ctx);
  if (!relativePath) return NextResponse.json({ error: '路径无效' }, { status: 400 });
  const meta = await fetchPageMeta(relativePath);
  return NextResponse.json({ meta: meta ?? null });
})

export const PUT = apiHandler('PUT', { label: 'page-meta.put', requireSudo: true }, async (req, ctx) => {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: '存储后端未配置', code: 'NOT_CONFIGURED' }, { status: 503 });
  }
  const relativePath = await resolveRelativePath(ctx);
  if (!relativePath) return NextResponse.json({ error: '路径无效' }, { status: 400 });
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }
  const parsed = parseMetaBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = await putPageMeta(relativePath, parsed.meta);
  if (!result.ok) return NextResponse.json({ error: result.error ?? '写入失败' }, { status: 500 });
  const saved = await fetchPageMeta(relativePath);
  return NextResponse.json({ ok: true, meta: saved });
})

export const DELETE = apiHandler('DELETE', { label: 'page-meta.delete', requireSudo: true }, async (_req, ctx) => {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: '存储后端未配置', code: 'NOT_CONFIGURED' }, { status: 503 });
  }
  const relativePath = await resolveRelativePath(ctx);
  if (!relativePath) return NextResponse.json({ error: '路径无效' }, { status: 400 });
  const result = await deletePageMeta(relativePath);
  if (!result.ok) return NextResponse.json({ error: result.error ?? '删除失败' }, { status: 500 });
  return NextResponse.json({ ok: true });
})
