import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/**
 * Web Vitals API — 已迁移到 @vercel/analytics
 *
 * GET: 返回提示信息，引导管理员查看 Vercel Dashboard
 * POST: 不再接收自建采集数据，返回 410 Gone
 */

export function POST() {
  return NextResponse.json(
    { error: '自建采集已停用，请使用 @vercel/analytics' },
    { status: 410 },
  );
}

export async function GET() {
  const session = await getSession();
  if (session?.role !== 'sudo') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  return NextResponse.json({
    migrated: true,
    message: 'Web Vitals 数据已迁移到 Vercel Analytics Dashboard',
    dashboard: 'https://vercel.com/.analytics',
  });
}
