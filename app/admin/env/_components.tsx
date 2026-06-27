'use client';

import React from 'react';
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
  Database,
  Lock,
  Globe,
  HardDrive,
  Mail,
  MessageCircle,
  Clock,
  Users,
  Settings,
  Info,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Card, Tag, Progress } from 'antd';
import { Button } from '@/components/ui/Button';

export interface EnvVar {
  name: string;
  isSet: boolean;
  required: boolean;
  descriptionKey: string;
  deprecated?: boolean;
  renamedTo?: string;
  systemInjected?: boolean;
}

export interface EnvGroup {
  name: string;
  nameKey: string;
  descriptionKey?: string;
  variables: EnvVar[];
}

export interface EnvSummary {
  total: number;
  set: number;
  required: number;
  requiredSet: number;
  optional: number;
  optionalSet: number;
  missingRequired: string[];
  isReady: boolean;
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const groupIcons: Record<string, React.ElementType> = {
  database: Database,
  auth: Shield,
  admin: Lock,
  app: Globe,
  github: GitBranch,
  giscus: MessageCircle,
  storage: HardDrive,
  smtp: Mail,
  cron: Clock,
  clerk: Users,
  system: Settings,
};

export const groupOrder: string[] = [
  'database',
  'auth',
  'admin',
  'app',
  'github',
  'giscus',
  'storage',
  'smtp',
  'cron',
  'clerk',
  'system',
];

const tagClass = 'rounded-lg text-[10px] leading-tight';

export function tr(t: TFunc, key: string, fallback = ''): string {
  const result = t(key);
  if (result === key || typeof result !== 'string') return fallback;
  return result;
}

function StatusBadge({ variable, t }: { variable: EnvVar; t: TFunc }) {
  return variable.required ? (
    <Tag color="error" className={tagClass}>
      {t('env.required') || '必需'}
    </Tag>
  ) : (
    <Tag className={`${tagClass} bg-zinc-50 border-zinc-200 text-zinc-500`}>{t('env.optional') || '可选'}</Tag>
  );
}

function HintLine({ tone, icon, children }: { tone: 'amber' | 'blue'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'amber' ? 'text-amber-600' : 'text-blue-600';
  return (
    <p className={`${cls} text-xs mt-1.5 flex items-start gap-1.5`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

export function EnvStatsCards({ summary, t }: { summary: EnvSummary; t: TFunc }) {
  const cells: { label: string; value: number; color: string }[] = [
    { label: t('env.summary.total') || '总变量', value: summary.total, color: 'text-zinc-900' },
    { label: t('env.summary.set') || '已设置', value: summary.set, color: 'text-emerald-600' },
    { label: t('env.summary.requiredMissing') || '必需缺失', value: summary.required - summary.requiredSet, color: 'text-red-500' },
    { label: t('env.summary.optionalMissing') || '可选缺失', value: summary.optional - summary.optionalSet, color: 'text-amber-500' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-zinc-100 p-4 text-center">
          <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
          <div className="text-xs text-zinc-400 font-medium mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function VariableStatusIcon({ variable, t }: { variable: EnvVar; t: TFunc }) {
  if (variable.isSet) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 size={16} />
        <span className="text-sm font-medium">{t('env.set') || '已设置'}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-1.5 ${variable.required ? 'text-red-500' : 'text-amber-500'}`}>
      <XCircle size={16} />
      <span className="text-sm font-medium">{t('env.notSet') || '未设置'}</span>
    </div>
  );
}

function VariableBadges({ variable, t }: { variable: EnvVar; t: TFunc }) {
  return (
    <>
      {variable.deprecated && (
        <Tag color="warning" className={tagClass}>
          <AlertTriangle size={10} className="inline-block mr-0.5" />
          {t('env.ui.deprecated') || '已弃用'}
        </Tag>
      )}
      {variable.systemInjected && (
        <Tag color="processing" className={tagClass}>
          <Sparkles size={10} className="inline-block mr-0.5" />
          {t('env.ui.systemInjected') || '自动注入'}
        </Tag>
      )}
    </>
  );
}

function VariableHints({ variable, t }: { variable: EnvVar; t: TFunc }) {
  const renamedHint = variable.renamedTo
    ? tr(t, 'env.ui.renamedHint', 'The new name is {name}. Migration is recommended.').replace('{name}', variable.renamedTo)
    : '';
  const deprecatedHint = variable.deprecated ? tr(t, 'env.ui.deprecatedHint', 'This variable is deprecated.') : '';
  const systemHint = variable.systemInjected ? tr(t, 'env.ui.systemInjectedHint', 'This variable is auto-injected.') : '';
  return (
    <>
      {variable.renamedTo && (
        <HintLine tone="amber" icon={<Info size={12} />}>
          {tr(t, 'env.ui.renamedTo', 'Renamed to {name}').replace('{name}', variable.renamedTo)}
          {renamedHint ? ` · ${renamedHint}` : ''}
        </HintLine>
      )}
      {variable.deprecated && deprecatedHint && (
        <HintLine tone="amber" icon={<AlertTriangle size={12} />}>
          {deprecatedHint}
        </HintLine>
      )}
      {variable.systemInjected && systemHint && (
        <HintLine tone="blue" icon={<Info size={12} />}>
          {systemHint}
        </HintLine>
      )}
    </>
  );
}

function EnvVariableRow({ variable, groupKey, t }: { variable: EnvVar; groupKey: string; t: TFunc }) {
  const description = tr(t, `env.vars.${groupKey}.${variable.name}`, '');
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md">
              {variable.name}
            </code>
            <StatusBadge variable={variable} t={t} />
            <VariableBadges variable={variable} t={t} />
          </div>
          {description && <p className="text-zinc-500 text-sm mt-1.5 leading-relaxed">{description}</p>}
          <VariableHints variable={variable} t={t} />
        </div>
        {!variable.systemInjected && (
          <div className="shrink-0">
            <VariableStatusIcon variable={variable} t={t} />
          </div>
        )}
      </div>
    </div>
  );
}

function EnvGroupCard({
  groupKey,
  group,
  collapsed,
  onToggle,
  icon: Icon,
  t,
}: {
  groupKey: string;
  group: EnvGroup;
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  t: TFunc;
}) {
  const groupSet = group.variables.filter((v) => v.isSet).length;
  const groupTotal = group.variables.length;
  const groupMissing = groupTotal - groupSet;
  const allReady = groupMissing === 0;
  const groupName = tr(t, `${group.nameKey}.name`, group.name);
  const groupDesc = group.descriptionKey ? tr(t, group.descriptionKey, '') : '';

  return (
    <Card className="rounded-2xl border border-zinc-100 overflow-hidden" bordered={false} styles={{ body: { padding: 0 } }}>
      <Button variant="ghost" size="sm" block rounded="none" className="justify-between px-6 py-4 hover:bg-zinc-50/50" onClick={onToggle} autoLoading={false}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
            <Icon size={18} className="text-zinc-600" />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-zinc-900">{groupName}</span>
              <span className="text-zinc-400 text-sm">{groupSet}/{groupTotal}</span>
            </div>
            {groupDesc && !collapsed && <p className="text-zinc-400 text-xs mt-0.5 max-w-md truncate">{groupDesc}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {allReady ? (
            <Tag color="success" className="rounded-lg mr-2">{t('env.ui.allReady') || '全部就绪'}</Tag>
          ) : (
            <Tag color="warning" className="rounded-lg mr-2">
              {tr(t, 'env.ui.missingCount', '{count} 项缺失').replace('{count}', String(groupMissing))}
            </Tag>
          )}
          {collapsed ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronUp size={16} className="text-zinc-400" />}
        </div>
      </Button>
      {!collapsed && (
        <div className="divide-y divide-zinc-50">
          {group.variables.map((variable) => (
            <EnvVariableRow key={variable.name} variable={variable} groupKey={groupKey} t={t} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function SummaryHero({ summary, t }: { summary: EnvSummary; t: TFunc }) {
  const progressPercent = summary.total > 0 ? Math.round((summary.set / summary.total) * 100) : 0;
  const isReady = summary.isReady;
  return (
    <Card
      className={`rounded-2xl border mb-4 ${isReady ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50'}`}
      bordered={false}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isReady ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {isReady ? <CheckCircle2 size={28} className="text-emerald-600" /> : <AlertTriangle size={28} className="text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-zinc-900 mb-1">
            {isReady ? t('env.ready') || '环境配置完成' : t('env.notReady') || '缺少必要环境变量'}
          </h2>
          <p className="text-zinc-500 text-sm mb-4">
            {tr(t, 'env.summary', '已设置 {set}/{total} 个变量 · 必需 {requiredSet}/{required} 个')
              .replace('{set}', String(summary.set))
              .replace('{total}', String(summary.total))
              .replace('{requiredSet}', String(summary.requiredSet))
              .replace('{required}', String(summary.required))}
          </p>
          <Progress
            percent={progressPercent}
            strokeColor={isReady ? '#10b981' : '#f59e0b'}
            trailColor={isReady ? '#d1fae5' : '#fef3c7'}
            size="small"
            className="max-w-md"
          />
          {!isReady && (
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.missingRequired.map((name) => (
                <Tag key={name} color="error" className="rounded-lg text-xs">{name}</Tag>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function HeaderActions({
  onToggleAll,
  onRefresh,
  allCollapsed,
  t,
}: {
  onToggleAll: (collapse: boolean) => void;
  onRefresh: () => void;
  allCollapsed: boolean;
  t: TFunc;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        rounded="md"
        icon={allCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        onClick={() => onToggleAll(!allCollapsed)}
        autoLoading={false}
      >
        {allCollapsed ? t('env.ui.expandAll') || '全部展开' : t('env.ui.collapseAll') || '全部折叠'}
      </Button>
      <Button variant="default" rounded="md" icon={<RefreshCw size={14} />} onClick={onRefresh}>
        {t('env.refresh') || '刷新'}
      </Button>
    </div>
  );
}

export function EnvGroupSection({
  groupKey,
  group,
  collapsed,
  onToggleCollapsed,
  t,
}: {
  groupKey: string;
  group: EnvGroup;
  collapsed: boolean;
  onToggleCollapsed: (key: string) => void;
  t: TFunc;
}) {
  const Icon = groupIcons[groupKey] ?? Server;
  return (
    <EnvGroupCard
      groupKey={groupKey}
      group={group}
      icon={Icon}
      collapsed={collapsed}
      onToggle={() => onToggleCollapsed(groupKey)}
      t={t}
    />
  );
}
