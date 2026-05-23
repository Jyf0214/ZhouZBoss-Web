'use client';

import React, { useState, useEffect, type ComponentType } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  theme?: string;
}

const themeMap: Record<string, string> = {
  light: 'oneLight',
  dark: 'vscDarkPlus',
};

function resolveTheme(theme: string): string {
  return themeMap[theme] ?? 'vscDarkPlus';
}

interface HighlighterProps {
  style: Record<string, React.CSSProperties>;
  language: string;
  PreTag: string;
  className?: string;
  children: string;
  [key: string]: unknown;
}

interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}

export function MarkdownRenderer({ content, theme: themeProp }: MarkdownRendererProps) {
  const [highlighter, setHighlighter] = useState<{
    Component: ComponentType<HighlighterProps>;
    style: Record<string, React.CSSProperties>;
  } | null>(null);

  useEffect(() => {
    const themeName = resolveTheme(themeProp ?? 'dark');
    Promise.all([
      import('react-syntax-highlighter/dist/esm/prism'),
      import('react-syntax-highlighter/dist/esm/styles/prism'),
    ]).then(([prismMod, stylesMod]) => {
      const mod = stylesMod as Record<string, Record<string, React.CSSProperties>>;
      const style = mod[themeName] ?? mod.vscDarkPlus;
      setHighlighter({
        Component: prismMod.default as ComponentType<HighlighterProps>,
        style,
      });
    }).catch((error) => {
      console.error('代码高亮模块加载失败，降级为普通代码块:', error);
    });
  }, [themeProp]);

  const components: Record<string, ComponentType<CodeProps>> = {
    code({ inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className ?? '');
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
