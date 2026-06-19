import { NextResponse } from 'next/server';
import { apiHandler, getMetricsSnapshot, type MetricEntry } from '@/lib/api-handler';

/** 对已排序数组计算分位数（近似值） */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.ceil((p / 100) * sorted.length) - 1, sorted.length - 1);
  return sorted[idx]!;
}

/** 计算单组延迟统计 */
function computeLatencyStats(latencies: number[]): {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    avg: Math.round((sum / sorted.length) * 100) / 100,
    p50: Math.round(percentile(sorted, 50) * 100) / 100,
    p95: Math.round(percentile(sorted, 95) * 100) / 100,
    p99: Math.round(percentile(sorted, 99) * 100) / 100,
  };
}

/** 按路由聚合 Top 10 */
function topRoutesByCount(entries: readonly MetricEntry[], limit = 10) {
  const routeMap = new Map<string, { count: number; latencies: number[]; errors: number }>();

  for (const e of entries) {
    let bucket = routeMap.get(e.route);
    if (!bucket) {
      bucket = { count: 0, latencies: [], errors: 0 };
      routeMap.set(e.route, bucket);
    }
    bucket.count++;
    bucket.latencies.push(e.latencyMs);
    if (e.statusCode >= 400) bucket.errors++;
  }

  return Array.from(routeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([route, data]) => ({
      route,
      count: data.count,
      errorRate: Math.round((data.errors / data.count) * 10000) / 100,
      ...computeLatencyStats(data.latencies),
    }));
}

/**
 * API 延迟性能指标端点
 * 仅管理员可访问，返回最近 1000 条请求的聚合统计
 */
export const GET = apiHandler('GET', { label: '获取延迟指标', requireAdmin: true }, () => {
  const entries = getMetricsSnapshot();
  const totalCount = entries.length;

  if (totalCount === 0) {
    return NextResponse.json({
      totalCount: 0,
      avgLatency: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      topRoutes: [],
      collectedAt: Date.now(),
    });
  }

  const allLatencies = entries.map((e) => e.latencyMs);
  const errorCount = entries.filter((e) => e.statusCode >= 400).length;
  const stats = computeLatencyStats(allLatencies);

  return NextResponse.json({
    totalCount,
    avgLatency: stats.avg,
    p50: stats.p50,
    p95: stats.p95,
    p99: stats.p99,
    errorRate: Math.round((errorCount / totalCount) * 10000) / 100,
    topRoutes: topRoutesByCount(entries),
    collectedAt: Date.now(),
  });
});
