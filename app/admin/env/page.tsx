'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { Server } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  type EnvGroup,
  type EnvSummary,
  groupOrder,
  EnvStatsCards,
  SummaryHero,
  HeaderActions,
  EnvGroupSection,
} from './_components';

interface EnvStatus {
  groups: Record<string, EnvGroup>;
  summary: EnvSummary;
}

export default function EnvStatusPage() {
  const { isSudo, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const hasRedirected = useRef(false);
  const hasFetched = useRef(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchEnvStatus = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/env-status', { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setEnvStatus(data);
      } else {
        showError('环境变量状态加载失败');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to fetch env status:', error);
      showError('环境变量状态加载失败');
    } finally {
      setLoading(false);
      hasFetched.current = true;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSudo && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/');
      return;
    }
    if (isSudo && !hasFetched.current) {
      void fetchEnvStatus();
    }
    return () => abortRef.current?.abort();
  }, [authLoading, isSudo, router, fetchEnvStatus]);

  const handleToggleCollapsed = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleToggleAll = useCallback((collapse: boolean) => {
    setCollapsed((prev) => {
      const next: Record<string, boolean> = { ...prev };
      groupOrder.forEach((k) => {
        next[k] = collapse;
      });
      return next;
    });
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
      </div>
    );
  }

  if (!isSudo) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlobalLoading size="large" />
      </div>
    );
  }

  if (!envStatus) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-zinc-400">获取环境变量状态失败</span>
      </div>
    );
  }

  const { groups, summary } = envStatus;
  const orderedEntries = Object.entries(groups).sort(([a], [b]) => {
    const ai = groupOrder.indexOf(a);
    const bi = groupOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const allCollapsed = orderedEntries.every(([key]) => collapsed[key]);

  return (
    <PageContainer maxWidth="4xl" className="bg-zinc-50">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
            <Server size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-zinc-900">{t('env.title') || '环境变量状态'}</h1>
            <p className="text-zinc-400 text-sm">{t('env.subtitle') || '检查系统所需环境变量配置'}</p>
          </div>
        </div>
        <HeaderActions onToggleAll={handleToggleAll} onRefresh={fetchEnvStatus} allCollapsed={allCollapsed} t={t} />
      </div>

      <SummaryHero summary={summary} t={t} />
      <EnvStatsCards summary={summary} t={t} />

      <div className="space-y-4">
        {orderedEntries.map(([key, group]) => (
          <EnvGroupSection
            key={key}
            groupKey={key}
            group={group}
            collapsed={!!collapsed[key]}
            onToggleCollapsed={handleToggleCollapsed}
            t={t}
          />
        ))}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-blue-600 text-sm">💡</span>
        </div>
        <div>
          <p className="text-blue-800 text-sm font-medium">
            {t('env.tip') || '在 Vercel 项目的 Settings → Environment Variables 中配置环境变量。'}
          </p>
          <p className="text-blue-600 text-xs mt-1">修改后需要重新部署才能生效。</p>
        </div>
      </div>
    </PageContainer>
  );
}
