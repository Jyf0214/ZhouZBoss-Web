'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { GlobalLoading } from '@/components/Loading';
import ProCard from '@/components/ui/ProCard';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { ScrollText, ChevronLeft, ChevronRight, Search } from 'lucide-react';

/* ---------- 类型 ---------- */

interface AuditLog {
  id?: number;
  action: string;
  target: string;
  detail: string | null;
  userId: string;
  createdAt: string;
}

interface AuditData {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------- 页面主体 ---------- */

export default function AuditPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选状态
  const [actionFilter, setActionFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchLogs = useCallback(async (targetPage: number, action?: string, userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('pageSize', String(pageSize));
      if (action) params.set('action', action);
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
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
  }, [pageSize]);

  useEffect(() => {
    if (!authLoading && user && isSudo) {
      void fetchLogs(page, actionFilter ?? undefined, operatorFilter ?? undefined);
    }
  }, [authLoading, user, isSudo, page, fetchLogs, actionFilter, operatorFilter]);

  const handleSearch = () => {
    setPage(1);
    void fetchLogs(1, actionFilter ?? undefined, operatorFilter ?? undefined);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  if (authLoading) return <GlobalLoading />;

  return (
    <PageContainer maxWidth="6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">审计日志</h1>
        <p className="text-zinc-400 text-sm mt-1">查看管理员操作记录</p>
      </div>

      {/* 筛选栏 */}
      <ProCard padding="p-4" className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="操作类型筛选"
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <input
            type="text"
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            placeholder="操作者筛选"
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Search size={14} />}
            onClick={handleSearch}
            loading={loading}
          >
            {loading ? '查询中...' : '查询'}
          </Button>
        </div>
      </ProCard>

      {loading && !data && (
        <div className="flex items-center justify-center py-20"><GlobalLoading /></div>
      )}

      {error && (
        <ProCard padding="p-6">
          <div className="text-center">
            <div className="text-red-500 text-sm mb-3">{error}</div>
            <Button
              variant="primary"
              onClick={() => void fetchLogs(page, actionFilter ?? undefined, operatorFilter ?? undefined)}
            >
              重试
            </Button>
          </div>
        </ProCard>
      )}

      {data && (
        <>
          {/* 表格 */}
          <ProCard padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-5 py-3 font-medium text-zinc-500">时间</th>
                    <th className="text-left px-5 py-3 font-medium text-zinc-500">操作者</th>
                    <th className="text-left px-5 py-3 font-medium text-zinc-500">操作类型</th>
                    <th className="text-left px-5 py-3 font-medium text-zinc-500">操作对象</th>
                    <th className="text-left px-5 py-3 font-medium text-zinc-500">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-400">
                        <ScrollText size={32} className="mx-auto mb-2 opacity-30" />
                        暂无审计日志
                      </td>
                    </tr>
                  ) : (
                    data.logs.map((log, i) => (
                      <tr key={log.id ?? i} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="px-5 py-3 text-zinc-700 font-medium">{log.userId ?? '-'}</td>
                        <td className="px-5 py-3">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 rounded-md">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-600">{log.target ?? '-'}</td>
                        <td className="px-5 py-3 text-zinc-500 max-w-xs truncate" title={log.detail ?? ''}>
                          {log.detail ?? '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ProCard>

          {/* 分页 */}
          {data.total > pageSize && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>共 {data.total} 条记录</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
