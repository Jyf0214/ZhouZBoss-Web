'use client';

import React from 'react';
import { Github, CheckCircle, XCircle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

/** GitHub 状态卡片属性 */
export interface GitHubStatusCardProps {
  /** 是否已配置 */
  configured: boolean;
  /** 仓库地址 */
  repo: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * GitHub 状态卡片组件
 * 包含配置状态、提示信息
 */
export function GitHubStatusCard({ configured, repo, className }: GitHubStatusCardProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'p-4 rounded-xl flex items-center gap-3',
        configured ? 'bg-emerald-50' : 'bg-amber-50',
        className
      )}
    >
      <Github size={20} className="text-zinc-600" />
      {configured ? (
        <>
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="font-medium text-sm text-zinc-700">
            {t('config.githubConfigured') || 'GitHub 已配置'}
          </span>
          {repo && (
            <span className="text-xs text-zinc-400 ml-auto">{repo}</span>
          )}
        </>
      ) : (
        <>
          <XCircle size={20} className="text-amber-500" />
          <span className="font-medium text-sm text-zinc-700">
            {t('config.githubNotConfigured') || 'GitHub 未配置'}
          </span>
        </>
      )}
    </div>
  );
}

export default GitHubStatusCard;
