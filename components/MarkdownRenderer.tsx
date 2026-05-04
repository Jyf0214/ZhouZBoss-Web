'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Markdown 渲染组件
 * 代码高亮使用动态加载，避免 SSR 时 ESM/CJS 兼容问题
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [highlighter, setHighlighter] = useState<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Component: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style: any;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      import('react-syntax-highlighter/dist/esm/prism'),
      import('react-syntax-highlighter/dist/esm/styles/prism'),
    ]).then(([prismMod, stylesMod]) => {
      setHighlighter({
        Component: prismMod.default,
        style: stylesMod.vscDarkPlus,
      });
    }).catch(() => {
      // 高亮加载失败时静默降级
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: Record<string, React.ComponentType<any>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && highlighter) {
        return (
          <div className="relative group my-8">
            <div className="absolute top-0 right-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 rounded-bl-xl rounded-tr-2xl">
              {match[1]}
            </div>
            <highlighter.Component
              style={highlighter.style}
              language={match[1]}
              PreTag="div"
              className="rounded-2xl !p-0 !m-0 overflow-hidden border border-zinc-800"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </highlighter.Component>
          </div>
        );
      }
      if (!inline && match && !highlighter) {
        return (
          <div className="relative group my-8">
            <div className="absolute top-0 right-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 rounded-bl-xl rounded-tr-2xl">
              {match[1]}
            </div>
            <pre className="bg-zinc-900 rounded-2xl p-6 pt-8 text-sm text-zinc-300 overflow-x-auto border border-zinc-800">
              <code>{String(children).replace(/\n$/, '')}</code>
            </pre>
          </div>
        );
      }
      return (
        <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md text-[0.875em] font-mono font-medium" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-zinc max-w-none
      prose-headings:tracking-tight prose-headings:text-zinc-900
      prose-h1:text-4xl prose-h1:font-black prose-h1:mb-8 prose-h1:mt-16
      prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-14 prose-h2:pb-3 prose-h2:border-b prose-h2:border-zinc-100
      prose-h3:text-xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10
      prose-p:text-zinc-600 prose-p:leading-[1.8] prose-p:text-[15px]
      prose-a:text-zinc-900 prose-a:font-semibold prose-a:underline prose-a:decoration-zinc-300 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-900
      prose-strong:text-zinc-900 prose-strong:font-bold
      prose-blockquote:border-zinc-900 prose-blockquote:bg-zinc-50 prose-blockquote:rounded-r-2xl prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-zinc-600
      prose-li:text-zinc-600 prose-li:text-[15px]
      prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100
      prose-hr:border-zinc-100 prose-hr:my-12
    ">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
