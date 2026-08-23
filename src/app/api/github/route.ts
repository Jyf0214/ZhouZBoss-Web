import { NextResponse } from 'next/server';
import { getEnvConfig } from '@/lib/env';
import { Octokit } from 'octokit';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { composeFileContent } from '@/lib/github';
import { getSessionWithKeyId, requireApiKeyPermission, isRootRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/github');

/**
 * 统一 GitHub 操作端点
 * POST: 创建/更新/删除文件
 * GET: 读取文件
 */

/** 允许访问的仓库路径白名单：仅站点内容目录与配置文件 */
const ALLOWED_EXACT_PATHS = ['config.yaml'];
const ALLOWED_PREFIXES = ['posts/', 'faces/'];

/** 路径是否在白名单内（防读取/写入仓库任意文件） */
function isAllowedRepoPath(path: string): boolean {
  if (ALLOWED_EXACT_PATHS.includes(path)) return true;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * 路径与权限守卫：白名单校验 + config.yaml 的 root-only 口径。
 * config.yaml 属 root-only 配置（与 /api/config 的 requireRoot 同口径）：
 * 否则 admin 可经 GitHub 写通道绕过配置管控与 sudo 提权审批链
 */
function guardRepoPath(path: unknown, role: string, uid: string): NextResponse | null {
  if (typeof path !== 'string' || path.includes('..') || path.includes('\\') || path.startsWith('/') || !isAllowedRepoPath(path)) {
    void logAudit('github_operation_failed', 'github', `GitHub 操作失败：路径非法（${String(path)}）`, uid);
    return NextResponse.json({ error: getTranslate('api.storage.invalidFilePath') }, { status: 400 });
  }
  if (path === 'config.yaml' && !isRootRole(role)) {
    void logAudit('github_operation_failed', 'github', 'GitHub 操作失败：config.yaml 需要 root 权限', uid);
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }
  return null;
}

/**
 * API 密钥细粒度权限检查
 * Cookie 认证(浏览器)直接通过；密钥认证检查 posts_* 权限
 */
async function requireGithubPerm(action: 'posts_read' | 'posts_write'): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, action);
}

function validateGithubEnv(): { owner: string; repo: string; octokit: Octokit } | NextResponse {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('POST', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }
  const [owner = '', repo = ''] = env.githubRepo.split('/');
  const octokit = new Octokit({ auth: env.githubToken });
  return { owner, repo, octokit };
}

async function getFileSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | undefined> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if ('sha' in data) return data.sha;
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status !== 404) throw e;
  }
  return undefined;
}

async function executeDeleteAction(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  options: { sha?: string; message?: string },
): Promise<NextResponse> {
  if (!options.sha) {
    logger.warn('POST', '文件不存在，无法删除', { path });
    return NextResponse.json({ error: getTranslate('api.github.fileNotFound') }, { status: 404 });
  }
  await octokit.rest.repos.deleteFile({
    owner, repo, path,
    message: options.message ?? `delete: ${path}`,
    sha: options.sha,
  });
  logger.info('POST', '文件删除成功', { path });
  return NextResponse.json({ success: true });
}

export const POST = apiHandler('POST', { label: getTranslate('api.github.operation'), requireAdmin: true }, async (req, _ctx, session) => {
  const { action, path, content, message, frontMatter, body } = await req.json();
  logger.info('POST', '开始 GitHub 操作', { action, path });

  // 路径守卫 + config.yaml root-only 校验
  const pathDenied = guardRepoPath(path, session!.role, session!.uid);
  if (pathDenied) return pathDenied;

  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireGithubPerm('posts_write');
  if (denied) return denied;

  if (!action || !path) {
    logger.warn('POST', '缺少必需参数');
    void logAudit('github_operation_failed', 'github', 'GitHub 操作失败：缺少必需参数', session!.uid);
    return NextResponse.json({ error: getTranslate('api.github.missingParams') }, { status: 400 });
  }

  const envResult = validateGithubEnv();
  if (envResult instanceof NextResponse) return envResult;
  const { owner, repo, octokit } = envResult;

  const sha = action !== 'create'
    ? await getFileSha(octokit, owner, repo, path)
    : undefined;

  if (action === 'delete') {
    const resp = await executeDeleteAction(octokit, owner, repo, path, { sha, message });
    if (!resp.ok) {
      void logAudit('github_operation_failed', 'github', `GitHub 操作失败：${String(action)} ${path}`, session!.uid);
    } else {
      void logAudit('github_operation', 'github', `GitHub 操作成功：${String(action)} ${path}`, session!.uid);
    }
    return resp;
  }

  const fileContent = await composeFileContent(content, frontMatter, body);
  const result = await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path,
    message: message ?? `${action}: ${path}`,
    content: Buffer.from(fileContent).toString('base64'),
    sha,
  });

  logger.info('POST', '文件操作成功', { action, path });
  void logAudit('github_operation', 'github', `GitHub 操作成功：${String(action)} ${path}`, session!.uid);
  return NextResponse.json({ success: true, sha: result.data.content?.sha });
});

export const GET = apiHandler('GET', { label: getTranslate('api.github.readFile'), requireAdmin: true }, async (req, _ctx, session) => {
  const path = new URL(req.url).searchParams.get('path');
  if (!path) {
    logger.warn('GET', '缺少路径参数');
    return NextResponse.json({ error: getTranslate('api.github.missingPath') }, { status: 400 });
  }

  // 路径守卫 + config.yaml root-only 校验
  const pathDenied = guardRepoPath(path, session!.role, session!.uid);
  if (pathDenied) return pathDenied;

  // API 密钥认证的请求需 posts_read 权限
  const denied = await requireGithubPerm('posts_read');
  if (denied) return denied;

  logger.info('GET', '读取 GitHub 文件', { path });
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('GET', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }

  const [owner = '', repo = ''] = env.githubRepo.split('/');
  const octokit = new Octokit({ auth: env.githubToken });

  const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

  // 文件内容随认证态变化，禁止 CDN 缓存
  const privateHeaders = { 'Cache-Control': 'private, no-cache, no-store', 'Vary': 'Cookie' };

  if (Array.isArray(data)) {
    logger.info('GET', '目录列表读取成功', { path, count: data.length });
    return NextResponse.json(data.map(file => ({
      name: file.name,
      path: file.path,
      type: file.type,
      sha: file.sha,
    })), { headers: privateHeaders });
  }

  if ('content' in data) {
    const raw = Buffer.from(data.content, 'base64').toString('utf-8');
    const matter = await import('gray-matter');
    const { data: frontMatter, content: body } = matter.default(raw);
    logger.info('GET', '文件读取成功', { path });
    return NextResponse.json({ raw, frontMatter, body, sha: data.sha }, { headers: privateHeaders });
  }

  logger.warn('GET', '无效路径', { path });
  return NextResponse.json({ error: getTranslate('api.github.invalidPath') }, { status: 400 });
});
