'use client';

import { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/ui';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  const copyError = async () => {
    const text = [
      isDev ? error.message : '',
      error.digest ? `Digest: ${error.digest}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板写入失败，静默忽略
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-50 p-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">页面加载失败</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isDev
              ? (error.message || '自定义页面加载出错，请重试')
              : '自定义页面加载出错，请重试'}
          </p>
        </div>
        {(error.message || error.digest) && (
          <div className="text-left">
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 flex items-center gap-1 mx-auto"
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  showDetail && 'rotate-180'
                )}
              />
              错误详情
            </button>
            {showDetail && (
              <pre className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 overflow-auto">
                {isDev ? error.message : ''}
                {error.digest ? `\n\nDigest: ${error.digest}` : ''}
              </pre>
            )}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={copyError}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Copy className="h-4 w-4" />
            {copied ? '已复制' : '复制错误'}
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
