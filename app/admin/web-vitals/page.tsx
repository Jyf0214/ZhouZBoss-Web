'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { GlobalLoading } from '@/components/Loading';
import ProCard from '@/components/ui/ProCard';
import { PageContainer } from '@/components/ui/PageContainer';
import { Gauge, Activity, Clock, AlertTriangle } from 'lucide-react';

/* ---------- 类型 ---------- */

interface MetricPercentiles {
  p50: number;
  p75: number;
  p95: number;
  count: number;
}

interface VitalsData {
  summary: Record<string, MetricPercentiles>;
  byPage: Record<string, Record<string, MetricPercentiles>>;
  total: number;
}

/* ---------- 评级颜色 ---------- */

function ratingColor(name: string, p75: number): string {
  // 基于 Web Vitals 评级阈值
  switch (name) {
    case 'LCP':
      return p75 <= 2500 ? 'text-emerald-600' : p75 <= 4000 ? 'text-amber-600' : 'text-red-600';
    case 'INP':
      return p75 <= 200 ? 'text-emerald-600' : p75 <= 500 ? 'text-amber-600' : 'text-red-600';
    case 'CLS':
      return p75 <= 0.1 ? 'text-emerald-600' : p75 <= 0.25 ? 'text-amber-600' : 'text-red-600';
    case 'TTFB':
      return p75 <= 800 ? 'text-emerald-600' : p75 <= 1800 ? 'text-amber-600' : 'text-red-600';
    default:
      return 'text-zinc-600';
  }
}

/* ---------- 指标单位 ---------- */

function formatValue(name: string, value: number): string {
  if (name === 'CLS') return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

/* ---------- 指标图标 ---------- */

function metricIcon(name: string) {
  switch (name) {
    case 'LCP': return Clock;
    case 'INP': return Activity;
    case 'CLS': return AlertTriangle;
    case 'TTFB': return Gauge;
    default: return Gauge;
  }
}

/* ---------- 指标描述 ---------- */

function metricDescription(name: string): string {
  switch (name) {
    case 'LCP': return '最大内容绘制 — 衡量加载性能';
    case 'INP': return '交互到下一帧绘制 — 衡量交互响应速度';
    case 'CLS': return '累积布局偏移 — 衡量视觉稳定性';
    case 'TTFB': return '首字节时间 — 衡量服务器响应速度';
    default: return '';
  }
}

/* ---------- 页面主体 ---------- */

export default function WebVitalsPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const [data, setData] = useState<VitalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/web-vitals');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `请求失败 (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && isSudo) {
      void fetchData();
    }
  }, [authLoading, user, isSudo, fetchData]);

  if (authLoading) return <GlobalLoading />;

  const metricNames = ['LCP', 'INP', 'CLS', 'TTFB'];
  const summary = data?.summary ?? {};

  return (
    <PageContainer maxWidth="6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Web Vitals</h1>
          <p className="text-zinc-400 text-sm mt-1">Core Web Vitals 性能指标监控</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-zinc-400">共 {data.total} 条记录</span>
          )}
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20"><GlobalLoading /></div>
      )}

      {error && (
        <ProCard padding="p-6">
          <div className="text-center">
            <div className="text-red-500 text-sm mb-3">{error}</div>
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              重试
            </button>
          </div>
        </ProCard>
      )}

      {data && (
        <>
          {/* 指标概览卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metricNames.map((name) => {
              const m = summary[name];
              const Icon = metricIcon(name);
              const color = m ? ratingColor(name, m.p75) : 'text-zinc-400';
              return (
                <ProCard key={name} padding="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={18} className={color} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-400 mb-1">{name}</div>
                      <div className={`text-xl font-bold ${color}`}>
                        {m ? formatValue(name, m.p75) : '--'}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">P75</div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-3">{metricDescription(name)}</div>
                </ProCard>
              );
            })}
          </div>

          {/* 详细分位数表格 */}
          <ProCard title="指标分位数详情" padding="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left py-3 px-4 font-medium text-zinc-500">指标</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">P50</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">P75</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">P95</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-500">样本数</th>
                  </tr>
                </thead>
                <tbody>
                  {metricNames.map((name) => {
                    const m = summary[name];
                    return (
                      <tr key={name} className="border-b border-zinc-50 last:border-0">
                        <td className="py-3 px-4 font-medium text-zinc-900">{name}</td>
                        <td className="py-3 px-4 text-right text-zinc-600">
                          {m ? formatValue(name, m.p50) : '--'}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-600">
                          {m ? formatValue(name, m.p75) : '--'}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-600">
                          {m ? formatValue(name, m.p95) : '--'}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-400">
                          {m ? m.count : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ProCard>

          {/* 按页面分组 */}
          {Object.keys(data.byPage).length > 0 && (
            <div className="mt-6">
              <ProCard title="按页面分组" padding="p-5">
                <div className="space-y-4">
                  {Object.entries(data.byPage).map(([page, metrics]) => (
                    <div key={page} className="border border-zinc-100 rounded-lg p-4">
                      <div className="text-sm font-medium text-zinc-900 mb-3">{page}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {metricNames.map((name) => {
                          const m = metrics[name];
                          return (
                            <div key={name} className="text-center">
                              <div className="text-xs text-zinc-400">{name}</div>
                              <div className="text-sm font-semibold text-zinc-700">
                                {m ? formatValue(name, m.p75) : '--'}
                              </div>
                              <div className="text-xs text-zinc-300">P75 · {m?.count ?? 0} 条</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ProCard>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
