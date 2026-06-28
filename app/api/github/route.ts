import { NextResponse } from 'next/server';
import { getEnvConfig } from '@/lib/env';
import { Octokit } from 'octokit';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/github');

/**
 * 统一 GitHub 操作端点
 * POST: 创建/更新/删除文件
 * GET: 读取文件
 */

function validateGithubEnv(): { owner: string; repo: string; octokit: Octokit } | NextResponse {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('POST', 'GitHub 配置缺失');
    return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
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

async function composeFileContent(
  content: string | undefined,
  frontMatter: unknown,
  body: string | undefined,
): Promise<string> {
  if (frontMatter && body !== undefined) {
    const yamlModule = await import('js-yaml');
    return `---\n${yamlModule.default.dump(frontMatter)}---\n\n${body}`;
  }
  return content ?? '';
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
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
  const result = await octokit.rest.repos.deleteFile({
    owner, repo, path,
    message: options.message ?? `delete: ${path}`,
    sha: options.sha,
  });
  logger.info('POST', '文件删除成功', { path });
  return NextResponse.json({ success: true, data: result.data });
}

export const POST = apiHandler('POST', { label: 'GitHub 操作', requireAdmin: true }, async (req) => {
  const { action, path, content, message, frontMatter, body } = await req.json();
  logger.info('POST', '开始 GitHub 操作', { action, path });

  if (!action || !path) {
    logger.warn('POST', '缺少必需参数');
    return NextResponse.json({ error: '缺少必需参数' }, { status: 400 });
  }

  // 路径穿越防护：拒绝含 .. 或 \ 的路径
  if (typeof path === 'string' && (path.includes('..') || path.includes('\\') || path.startsWith('/'))) {
    return NextResponse.json({ error: '无效的文件路径' }, { status: 400 });
  }

  const envResult = validateGithubEnv();
  if (envResult instanceof NextResponse) return envResult;
  const { owner, repo, octokit } = envResult;

  const sha = action !== 'create'
    ? await getFileSha(octokit, owner, repo, path)
    : undefined;

  if (action === 'delete') {
    return executeDeleteAction(octokit, owner, repo, path, { sha, message });
  }

  const fileContent = await composeFileContent(content, frontMatter, body);
  const result = await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path,
    message: message ?? `${action}: ${path}`,
    content: Buffer.from(fileContent).toString('base64'),
    sha,
  });

  logger.info('POST', '文件操作成功', { action, path });
  return NextResponse.json({ success: true, data: result.data });
});

export const GET = apiHandler('GET', { label: '读取 GitHub 文件', requireAdmin: true }, async (req) => {
  const path = new URL(req.url).searchParams.get('path');
  if (!path) {
    logger.warn('GET', '缺少路径参数');
    return NextResponse.json({ error: '缺少路径' }, { status: 400 });
  }

  logger.info('GET', '读取 GitHub 文件', { path });
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('GET', 'GitHub 配置缺失');
    return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
  }

  const [owner = '', repo = ''] = env.githubRepo.split('/');
  const octokit = new Octokit({ auth: env.githubToken });

  const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

  if (Array.isArray(data)) {
    logger.info('GET', '目录列表读取成功', { path, count: data.length });
    return NextResponse.json(data.map(file => ({
      name: file.name,
      path: file.path,
      type: file.type,
      sha: file.sha,
    })));
  }

  if ('content' in data) {
    const raw = Buffer.from(data.content, 'base64').toString('utf-8');
    const matter = await import('gray-matter');
    const { data: frontMatter, content: body } = matter.default(raw);
    logger.info('GET', '文件读取成功', { path });
    return NextResponse.json({ raw, frontMatter, body, sha: data.sha });
  }

  logger.warn('GET', '无效路径', { path });
  return NextResponse.json({ error: '无效路径' }, { status: 400 });
});
