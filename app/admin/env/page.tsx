'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Shield,
  GitBranch,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { Card, Tag, Spin, Progress, Button } from 'antd';

interface EnvVar {
  name: string;
  isSet: boolean;
  required: boolean;
  description: string;
}

interface EnvGroup {
  name: string;
  variables: EnvVar[];
}

interface EnvStatus {
  groups: Record<string, EnvGroup>;
  summary: {
    total: number;
    set: number;
    required: number;
    requiredSet: number;
    optional: number;
    optionalSet: number;
    missingRequired: string[];
    isReady: boolean;
  };
}

const groupIcons: Record<string, React.ElementType> = {
  database: Server,
  auth: Shield,
  github: GitBranch,
};

export default function EnvStatusPage() {
  const { isSudo } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isSudo) {
      router.push('/');
      return;
    }
    fetchEnvStatus();
  }, [isSudo, router]);

  const fetchEnvStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/env-status');
      if (res.ok) {
        const data = await res.json();
        setEnvStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch env status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSudo) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
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
  const progressPercent = summary.total > 0 ? Math.round((summary.set / summary.total) * 100) : 0;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200">
            <Server size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {t('env.title') || '环境变量状态'}
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              {t('env.subtitle') || '检查系统所需环境变量配置'}
            </p>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={14} />}
          onClick={fetchEnvStatus}
          className="rounded-xl border-zinc-200 hover:border-zinc-300"
        >
          刷新
        </Button>
      </div>

      {/* 状态概览 */}
      <Card
        className={`rounded-2xl border-2 mb-6 ${
          summary.isReady
            ? 'border-emerald-100 bg-emerald-50/50'
            : 'border-amber-100 bg-amber-50/50'
        }`}
        bordered={false}
      >
        <div className="flex items-start gap-5">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              summary.isReady ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {summary.isReady ? (
              <CheckCircle2 size={28} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={28} className="text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-zinc-900 mb-1">
              {summary.isReady
                ? t('env.ready') || '环境配置完成'
                : t('env.notReady') || '缺少必要环境变量'}
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              已设置 {summary.set}/{summary.total} 个变量 · 必需{' '}
              {summary.requiredSet}/{summary.required} 个
            </p>
            <Progress
              percent={progressPercent}
              strokeColor={summary.isReady ? '#10b981' : '#f59e0b'}
              trailColor={summary.isReady ? '#d1fae5' : '#fef3c7'}
              size="small"
              className="max-w-md"
            />
            {!summary.isReady && (
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.missingRequired.map((name) => (
                  <Tag key={name} color="error" className="rounded-lg text-xs">
                    {name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 text-center">
          <div className="text-2xl font-black text-zinc-900">{summary.total}</div>
          <div className="text-xs text-zinc-400 font-medium mt-1">总变量</div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">{summary.set}</div>
          <div className="text-xs text-zinc-400 font-medium mt-1">已设置</div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 text-center">
          <div className="text-2xl font-black text-red-500">
            {summary.required - summary.requiredSet}
          </div>
          <div className="text-xs text-zinc-400 font-medium mt-1">必需缺失</div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 text-center">
          <div className="text-2xl font-black text-amber-500">
            {summary.optional - summary.optionalSet}
          </div>
          <div className="text-xs text-zinc-400 font-medium mt-1">可选缺失</div>
        </div>
      </div>

      {/* 环境变量分组 */}
      <div className="space-y-4">
        {Object.entries(groups).map(([key, group]) => {
          const Icon = groupIcons[key] || Server;
          const groupSet = group.variables.filter((v) => v.isSet).length;
          const groupTotal = group.variables.length;
          const isCollapsed = collapsed[key];

          return (
            <Card
              key={key}
              className="rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
              bordered={false}
              styles={{ body: { padding: 0 } }}
            >
              {/* 分组标题 */}
              <button
                onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center">
                    <Icon size={18} className="text-zinc-600" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-zinc-900">{group.name}</span>
                    <span className="text-zinc-400 text-sm ml-2">
                      {groupSet}/{groupTotal}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {groupSet === groupTotal ? (
                    <Tag color="success" className="rounded-lg mr-2">
                      全部就绪
                    </Tag>
                  ) : (
                    <Tag color="warning" className="rounded-lg mr-2">
                      {groupTotal - groupSet} 项缺失
                    </Tag>
                  )}
                  {isCollapsed ? (
                    <ChevronDown size={16} className="text-zinc-400" />
                  ) : (
                    <ChevronUp size={16} className="text-zinc-400" />
                  )}
                </div>
              </button>

              {/* 变量列表 */}
              {!isCollapsed && (
                <div className="divide-y divide-zinc-50">
                  {group.variables.map((variable) => (
                    <div
                      key={variable.name}
                      className="px-6 py-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-mono font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md">
                            {variable.name}
                          </code>
                          {variable.required ? (
                            <Tag color="error" className="rounded-lg text-[10px] leading-tight">
                              必需
                            </Tag>
                          ) : (
                            <Tag className="rounded-lg text-[10px] leading-tight bg-zinc-50 border-zinc-200 text-zinc-500">
                              可选
                            </Tag>
                          )}
                        </div>
                        <p className="text-zinc-400 text-sm mt-1.5">{variable.description}</p>
                      </div>
                      <div className="shrink-0">
                        {variable.isSet ? (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 size={16} />
                            <span className="text-sm font-medium">已设置</span>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center gap-1.5 ${
                              variable.required ? 'text-red-500' : 'text-amber-500'
                            }`}
                          >
                            <XCircle size={16} />
                            <span className="text-sm font-medium">未设置</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 提示信息 */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-blue-600 text-sm">💡</span>
        </div>
        <div>
          <p className="text-blue-800 text-sm font-medium">
            在 Vercel 项目的 Settings → Environment Variables 中配置环境变量。
          </p>
          <p className="text-blue-600 text-xs mt-1">
            修改后需要重新部署才能生效。
          </p>
        </div>
      </div>
    </div>
  );
}
