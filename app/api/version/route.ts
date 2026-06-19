/**
 * 版本信息端点
 * GET /api/version → { major, minor, version }
 *
 * 大版本: package.json version
 * 小版本: git commit hash（构建时生成，代码不变则不变）
 */
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

interface VersionInfo {
  major: string;
  minor: string;
  version: string;
  generatedAt: string;
}

function readVersion(): VersionInfo {
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'version.json'), 'utf-8');
    const data = JSON.parse(raw) as { major: string; minor: string; generatedAt: string };
    return {
      major: data.major,
      minor: data.minor,
      version: `${data.major}+${data.minor}`,
      generatedAt: data.generatedAt,
    };
  } catch {
    return { major: '0.0.0', minor: 'unknown', version: '0.0.0+unknown', generatedAt: '' };
  }
}

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(readVersion(), {
    headers: { 'Cache-Control': 'public, s-maxage=3600, immutable' },
  });
}
