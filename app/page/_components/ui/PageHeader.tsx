'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题/描述 */
  description?: string;
  /** 返回链接地址，提供则显示返回按钮 */
  backHref?: string;
  /** 返回按钮文案，默认"返回" */
  backLabel?: string;
  /** 右侧操作区插槽 */
  actions?: React.ReactNode;
}

/**
 * 页面标题栏组件 — 统一各页面顶部标题区域的样式
 *
 * 布局：左侧 [返回按钮] + 标题 + 副标题，右侧 actions 插槽
 * 样式：白色背景 + 底部分割线，响应式 padding
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = '返回',
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link href={backHref}>
              <Button
                variant="ghost"
                size="sm"
                autoLoading={false}
                icon={<ArrowLeft size={16} />}
              >
                {backLabel}
              </Button>
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
