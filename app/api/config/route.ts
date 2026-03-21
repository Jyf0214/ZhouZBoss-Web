import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getFileFromGithub, syncConfigToGithub } from '@/lib/github';
import yaml from 'js-yaml';

/**
 * System Configuration API
 * Principle: GitHub config.yaml is the Source of Truth
 */

export async function GET() {
  const db = getDb();
  
  // 1. Try to get from local Redis (cached)
  let cached = await db.get('config:main');
  
  // 2. If not in cache, try to fetch from GitHub if credentials exist
  if (!cached) {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (repo && token) {
      try {
        const remote = await getFileFromGithub(repo, token, 'config.yaml');
        if (remote) {
          const parsed = yaml.load(remote.content) as any;
          await db.set('config:main', JSON.stringify(parsed));
          cached = JSON.stringify(parsed);
        }
      } catch (err) {
        console.error('Failed to auto-sync config from GitHub:', err);
      }
    }
  }

  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // 3. Default config if nothing else
  const defaultConfig = {
    siteTitle: 'Originium Kernel',
    siteDescription: 'Modern Content Platform',
    githubRepo: process.env.GITHUB_REPO || '',
    githubToken: process.env.GITHUB_TOKEN || '',
  };

  return NextResponse.json(defaultConfig);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: 'Unauthorized. Sudo required.' }, { status: 403 });
  }

  try {
    const newConfig = await req.json();
    const db = getDb();

    // 1. Update local DB (Cache)
    await db.set('config:main', JSON.stringify(newConfig));

    // 2. Sync to GitHub (Principle: overwrite config.yaml)
    if (newConfig.githubRepo && newConfig.githubToken) {
      await syncConfigToGithub(newConfig.githubRepo, newConfig.githubToken, newConfig);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update config error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Sync endpoint to force refresh from GitHub
 */
export async function PUT(req: NextRequest) {
  const db = getDb();
  
  // Get credentials from DB or Env
  const cached = await db.get('config:main');
  const config = cached ? JSON.parse(cached) : {};
  const repo = config.githubRepo || process.env.GITHUB_REPO;
  const token = config.githubToken || process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    return NextResponse.json({ error: 'GitHub credentials not configured' }, { status: 400 });
  }

  try {
    const remote = await getFileFromGithub(repo, token, 'config.yaml');
    if (remote) {
      const parsed = yaml.load(remote.content) as any;
      await db.set('config:main', JSON.stringify(parsed));
      return NextResponse.json({ success: true, config: parsed });
    }
    return NextResponse.json({ error: 'config.yaml not found on GitHub' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch from GitHub' }, { status: 500 });
  }
}
