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
    Component: any;
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

  const components: Record<string, React.ComponentType<any>> = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && highlighter) {
        return (
          <highlighter.Component
            style={highlighter.style}
            language={match[1]}
            PreTag="div"
            className="rounded-md !my-6"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </highlighter.Component>
        );
      }
      if (!inline && match && !highlighter) {
        return (
          <pre className="bg-zinc-900 rounded-md p-4 text-sm text-zinc-300 overflow-x-auto !my-6">
            <code>{String(children).replace(/\n$/, '')}</code>
          </pre>
        );
      }
      return (
        <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-zinc max-w-none prose-headings:font-display prose-a:text-emerald-600 hover:prose-a:text-emerald-700">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
