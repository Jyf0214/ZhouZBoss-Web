import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

// 内存存储最近 1000 条指标
const MAX_ENTRIES = 1000;
const metricsStore: {
  name: string;
  value: number;
  rating: string;
  path: string;
  userAgent: string;
  timestamp: number;
}[] = [];

// POST - 公开端点，接收指标数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, value, rating, path, userAgent } = body;

    // 校验必填字段
    if (!name || typeof value !== 'number') {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    // 允许的指标名称白名单
    const allowedMetrics = ['LCP', 'INP', 'CLS', 'TTFB'];
    if (!allowedMetrics.includes(name)) {
      return NextResponse.json({ error: '不支持的指标类型' }, { status: 400 });
    }

    // 入队，超过上限时移除最早的
    if (metricsStore.length >= MAX_ENTRIES) {
      metricsStore.shift();
    }
    metricsStore.push({
      name,
      value,
      rating: rating ?? 'unknown',
      path: path ?? '/',
      userAgent: userAgent ?? '',
      timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '请求处理失败' }, { status: 500 });
  }
}

// GET - 管理员认证，返回聚合指标
export async function GET() {
  const session = await getSession();
  if (session?.role !== 'sudo') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  // 按指标名称分组
  const grouped: Record<string, number[]> = {};
  for (const entry of metricsStore) {
    const arr = grouped[entry.name] ??= [];
    arr.push(entry.value);
  }

  // 计算分位数
  const percentiles = (values: number[]) => {
    if (values.length === 0) return { p50: 0, p75: 0, p95: 0, count: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const p = (n: number) => {
      const idx = Math.ceil((n / 100) * sorted.length) - 1;
      return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0;
    };
    return { p50: p(50), p75: p(75), p95: p(95), count: sorted.length };
  };

  // 按指标名聚合
  const summary: Record<string, ReturnType<typeof percentiles>> = {};
  for (const [name, values] of Object.entries(grouped)) {
    summary[name] = percentiles(values);
  }

  // 按页面分组
  const pageGrouped: Record<string, Record<string, number[]>> = {};
  for (const entry of metricsStore) {
    const p = entry.path ?? '/';
    const pageMetrics = pageGrouped[p] ??= {};
    const arr = pageMetrics[entry.name] ??= [];
    arr.push(entry.value);
  }

  const byPage: Record<string, Record<string, ReturnType<typeof percentiles>>> = {};
  for (const [page, metrics] of Object.entries(pageGrouped)) {
    byPage[page] = {};
    for (const [name, values] of Object.entries(metrics)) {
      byPage[page][name] = percentiles(values);
    }
  }

  return NextResponse.json({ summary, byPage, total: metricsStore.length });
}
