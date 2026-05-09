import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';
import { Octokit } from 'octokit';

/**
 * 统一 GitHub 操作端点
 * POST: 创建/更新/删除文件
 * GET: 读取文件
 */

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { action, path, content, message, frontMatter, body } = await req.json();

    if (!action || !path) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 });
    }

    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const [owner, repo] = env.githubRepo.split('/');
    const octokit = new Octokit({ auth: env.githubToken });

    // 获取 SHA（用于更新/删除）
    let sha: string | undefined;
    if (action !== 'create') {
      try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        if ('sha' in data) sha = data.sha;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }
    }

    // 构建文件内容
    let fileContent = content || '';
if (frontMatter && body !== undefined) {
      const yaml = await import('js-yaml');
      fileContent = `---\n${yaml.default.dump(frontMatter)}---\n\n${body}`;
    }

    if (action === 'delete') {
      if (!sha) return NextResponse.json({ error: '文件不存在' }, { status: 404 });
      const result = await octokit.rest.repos.deleteFile({
        owner, repo, path,
        message: message || `delete: ${path}`,
        sha,
      });
      return NextResponse.json({ success: true, data: result.data });
    }

    // create or update
    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path,
      message: message || `${action}: ${path}`,
      content: Buffer.from(fileContent).toString('base64'),
      sha,
    });

    return NextResponse.json({ success: true, data: result.data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('github_sync_error:', error.message);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const path = new URL(req.url).searchParams.get('path');
  if (!path) return NextResponse.json({ error: '缺少路径' }, { status: 400 });

  try {
    const env = getEnvConfig();
    if (!env.githubRepo || !env.githubToken) {
      return NextResponse.json({ error: 'GitHub 配置缺失' }, { status: 500 });
    }

    const [owner, repo] = env.githubRepo.split('/');
    const octokit = new Octokit({ auth: env.githubToken });

    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

    // Handle directory listing
    if (Array.isArray(data)) {
      return NextResponse.json(data.map(file => ({
        name: file.name,
        path: file.path,
        type: file.type,
        sha: file.sha,
      })));
    }

// Handle file content
    if ('content' in data) {
      const raw = Buffer.from(data.content, 'base64').toString('utf-8');
      const matter = await import('gray-matter');
      const { data: frontMatter, content: body } = matter.default(raw);

      return NextResponse.json({ raw, frontMatter, body, sha: data.sha });
    }

    return NextResponse.json({ error: '无效路径' }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.status === 404) return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    console.error('github_read_error:', error.message);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}
