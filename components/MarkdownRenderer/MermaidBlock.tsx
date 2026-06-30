'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidBlockProps {
  /** Mermaid 图表定义源码 */
  code: string;
}

/** 用于生成唯一 DOM id，避免多图表冲突 */
let mermaidIdCounter = 0;

/** mermaid 动态导入的最小类型声明，避免 import() 类型注解 */
interface MermaidLike {
  initialize(config: Record<string, unknown>): void;
  render(id: string, definition: string, container?: HTMLElement): Promise<{ svg: string }>;
}

/** 模块级缓存：mermaid 实例只 dynamic import 一次 */
let mermaidInstance: MermaidLike | null = null;
/** 标记 mermaid.initialize() 是否已执行过，避免重复初始化 */
let mermaidInitialized = false;

/**
 * Mermaid 图表渲染组件
 *
 * - 动态导入 mermaid（仅客户端，模块级缓存，只 import 一次）
 * - mermaid.initialize() 也只调用一次
 * - useEffect 中 chartRef 赋值前显示 loading，完成后隐藏
 * - 渲染失败时显示错误信息
 * - 容器 overflow-x-auto + max-width: 100%，SVG 自适应宽度
 */
export function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++mermaidIdCounter}-${Date.now()}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        // 模块级缓存：只 dynamic import 一次
        mermaidInstance ??= (await import('mermaid')).default;
        const mermaid = mermaidInstance;

        // 初始化配置：只执行一次
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'default',
          });
          mermaidInitialized = true;
        }

        if (cancelled || !containerRef.current) return;

        // 清空容器，准备重新渲染
        containerRef.current.innerHTML = '';

        const { svg } = await mermaid.render(idRef.current, code, containerRef.current);

        if (cancelled || !containerRef.current) return;

        // 过滤 SVG 中的危险元素和事件处理器，防止 XSS
        const sanitized = svg
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<use\b[^>]*\/?>/gi, '')
          .replace(/<animate\b[^<]*(?:(?!<\/animate>)<[^<]*)*<\/animate>/gi, '')
          .replace(/<set\b[^<]*(?:(?!<\/set>)<[^<]*)*<\/set>/gi, '')
          .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
          .replace(/javascript\s*:/gi, '')
          .replace(/data\s*:/gi, '');

        containerRef.current.innerHTML = sanitized;

        // 确保 SVG 自适应容器宽度
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Mermaid 渲染失败:', err);
        setError(err instanceof Error ? err.message : '图表渲染失败');
        setLoading(false);
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [code]);

  // 加载状态
  if (loading && !error) {
    return (
      <div className="my-8 flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-400">
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        图表加载中...
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="my-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <div className="font-medium">图表渲染失败</div>
        <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-red-500 opacity-75">{error}</pre>
      </div>
    );
  }

  // 渲染成功
  return (
    <div className="my-8 overflow-x-auto" style={{ maxWidth: '100%' }}>
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
