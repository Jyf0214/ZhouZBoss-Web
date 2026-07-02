'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const errorDetail = error.message ?? error.digest ?? '管理后台发生了未知错误';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <h2 className="text-xl font-semibold text-zinc-900 mb-2">页面出现错误</h2>
      <p className="text-zinc-600 mb-4">
        {process.env.NODE_ENV === 'development' ? errorDetail : '管理后台发生了未知错误'}
      </p>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          重试
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? '已复制' : '复制错误'}
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? '收起详情' : '展开详情'}
        </button>
      )}
      {expanded && (
        <pre className="mt-2 p-4 text-xs text-left bg-zinc-50 rounded-lg overflow-auto max-w-full text-zinc-700">
          {errorDetail}
          {error.digest && `\n\nDigest: ${error.digest}`}
        </pre>
      )}
    </div>
  );
}
