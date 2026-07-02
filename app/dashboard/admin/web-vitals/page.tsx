'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Gauge, BarChart3, Zap, Shield } from 'lucide-react';

/** 指标说明卡片 */
const features = [
  {
    icon: Gauge,
    title: 'Core Web Vitals',
    desc: 'LCP、INP、CLS、TTFB 等核心性能指标，基于真实用户数据采集',
  },
  {
    icon: BarChart3,
    title: '分位数统计',
    desc: 'P50 / P75 / P95 分位数，按页面和指标维度聚合',
  },
  {
    icon: Zap,
    title: '实时监控',
    desc: '数据自动持久化，不受 Serverless 冷启动影响',
  },
  {
    icon: Shield,
    title: '生产级可靠性',
    desc: '由 Vercel 平台直接采集，数据完整、准确、可追溯',
  },
];

export default function WebVitalsPage() {
  const { user, isSudo, loading: authLoading } = useAuth();

  if (authLoading) return <GlobalLoading />;
  if (!user || !isSudo) return null;

  const vercelAnalyticsUrl = 'https://vercel.com/.analytics';

  return (
    <PageContainer maxWidth="4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Web Vitals</h1>
        <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">Core Web Vitals 性能指标监控</p>
      </div>

      {/* 迁移提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <ExternalLink size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              数据已迁移到 Vercel Analytics
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Web Vitals 数据现在由 Vercel 平台直接采集和存储，
              不再使用自建的内存存储方案。请前往 Vercel Dashboard 查看完整的性能数据。
            </p>
            <Button
              variant="primary"
              size="md"
              icon={<ExternalLink size={16} />}
              onClick={() => window.open(vercelAnalyticsUrl, '_blank')}
              autoLoading={false}
            >
              打开 Vercel Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* 功能说明 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{f.title}</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
