import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';
import { Octokit } from 'octokit';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/github');

/**
 * 统一 GitHub 操作端点
 * POST: 创建/更新/删除文件
 * GET: 读取文件
 */

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    logger.warn('POST', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { action, path, content, message, frontMatter, body } = await req.json();
    logger.info('POST', '开始 GitHub 操作', { action, path });

    if (!action || !path) {
      logger.warn('POST', '缺少必需参数');
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 });
    }

    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      logger.error('POST', 'GitHub 配置缺失');
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const [owner, repo] = env.githubRepo.split('/');
    const octokit = new Octokit({ auth: env.githubToken });

    let sha: string | undefined;
    if (action !== 'create') {
      try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        if ('sha' in data) sha = data.sha;
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err.status !== 404) throw e;
      }
    }

    let fileContent = content || '';
    if (frontMatter && body !== undefined) {
      const yaml = await import('js-yaml');
      fileContent = `---\n${yaml.default.dump(frontMatter)}---\n\n${body}`;
    }

    if (action === 'delete') {
      if (!sha) {
        logger.warn('POST', '文件不存在，无法删除', { path });
        return NextResponse.json({ error: '文件不存在' }, { status: 404 });
      }
      const result = await octokit.rest.repos.deleteFile({
        owner, repo, path,
        message: message || `delete: ${path}`,
        sha,
      });
      logger.info('POST', '文件删除成功', { path });
      return NextResponse.json({ success: true, data: result.data });
    }

    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path,
      message: message || `${action}: ${path}`,
      content: Buffer.from(fileContent).toString('base64'),
      sha,
    });

    logger.info('POST', '文件操作成功', { action, path });
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error('POST', 'GitHub 操作失败', { error: err.message });
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    logger.warn('GET', '未登录');
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const path = new URL(req.url).searchParams.get('path');
  if (!path) {
    logger.warn('GET', '缺少路径参数');
    return NextResponse.json({ error: '缺少路径' }, { status: 400 });
  }

  try {
    logger.info('GET', '读取 GitHub 文件', { path });
    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      logger.error('GET', 'GitHub 配置缺失');
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const [owner, repo] = env.githubRepo.split('/');
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
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 404) {
      logger.warn('GET', '文件不存在', { path });
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }
    logger.error('GET', '读取失败', { path, error: err.message });
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}
