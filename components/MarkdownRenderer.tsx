'use client';

import React, { useState, useEffect, useCallback, type ComponentType } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ChevronDown, ChevronUp, WrapText } from 'lucide-react';

interface HighlightConfig {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
}

interface MarkdownRendererProps {
  content: string;
  highlight?: HighlightConfig;
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

function CodeToolbar({
  language,
  cfg,
  copied,
  collapsed,
  wrap,
  exceedsLimit,
  showWrap,
  onCopy,
  onToggleCollapse,
  onToggleWrap,
}: {
  language: string;
  cfg: HighlightConfig;
  copied: boolean;
  collapsed: boolean;
  wrap: boolean;
  exceedsLimit: boolean;
  showWrap: boolean;
  onCopy: () => void;
  onToggleCollapse: () => void;
  onToggleWrap: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 rounded-t-2xl border-b border-zinc-700">
      <div className="flex items-center gap-2">
        {cfg.lang && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {language}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {cfg.copy && (
          <button
            onClick={onCopy}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            title="复制代码"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
        {showWrap && cfg.wordWrap && (
          <button
            onClick={onToggleWrap}
            className={`p-1 rounded-md transition-colors ${wrap ? 'text-zinc-200 bg-zinc-700' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'}`}
            title="自动换行"
          >
            <WrapText size={14} />
          </button>
        )}
        {exceedsLimit && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            title={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function HighlightedCodeBlock({
  children,
  language,
  highlighter,
  cfg,
  collapsed,
  wrap,
  copied,
  exceedsLimit,
  onCopy,
  onToggleCollapse,
  onToggleWrap,
}: {
  children: string;
  language: string;
  highlighter: { Component: ComponentType<HighlighterProps>; style: Record<string, React.CSSProperties> };
  cfg: HighlightConfig;
  collapsed: boolean;
  wrap: boolean;
  copied: boolean;
  exceedsLimit: boolean;
  onCopy: () => void;
  onToggleCollapse: () => void;
  onToggleWrap: () => void;
}) {
  return (
    <div className={`relative group my-8 ${collapsed ? 'max-h-40 overflow-hidden' : ''}`}>
      <CodeToolbar
        language={language}
        cfg={cfg}
        copied={copied}
        collapsed={collapsed}
        wrap={wrap}
        exceedsLimit={exceedsLimit}
        showWrap
        onCopy={onCopy}
        onToggleCollapse={onToggleCollapse}
        onToggleWrap={onToggleWrap}
      />
      <div className={`${wrap ? '' : 'overflow-x-auto'} rounded-b-2xl border border-zinc-800 border-t-0`}>
        <highlighter.Component
          style={highlighter.style}
          language={language}
          PreTag="div"
          className="!p-4 !m-0 !bg-transparent"
          {...(wrap ? { wrapLines: true, lineProps: { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } } } : {})}
        >
          {children.replace(/\n$/, '')}
        </highlighter.Component>
      </div>
    </div>
  );
}

function PlainCodeBlock({
  children,
  language,
  cfg,
  collapsed,
  copied,
  exceedsLimit,
  onCopy,
  onToggleCollapse,
}: {
  children: string;
  language: string;
  cfg: HighlightConfig;
  collapsed: boolean;
  copied: boolean;
  exceedsLimit: boolean;
  onCopy: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <div className={`relative group my-8 ${collapsed ? 'max-h-40 overflow-hidden' : ''}`}>
      <CodeToolbar
        language={language}
        cfg={cfg}
        copied={copied}
        collapsed={collapsed}
        wrap={false}
        exceedsLimit={exceedsLimit}
        showWrap={false}
        onCopy={onCopy}
        onToggleCollapse={onToggleCollapse}
        onToggleWrap={() => undefined}
      />
      <pre className="bg-zinc-900 rounded-b-2xl p-4 text-sm text-zinc-300 border border-zinc-800 border-t-0 overflow-x-auto">
        <code>{children.replace(/\n$/, '')}</code>
      </pre>
    </div>
  );
}

function CodeBlock({
  children,
  language,
  highlighter,
  cfg,
}: {
  children: string;
  language: string;
  highlighter: { Component: ComponentType<HighlighterProps>; style: Record<string, React.CSSProperties> } | null;
  cfg: HighlightConfig;
}) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(cfg.shrink);
  const [wrap, setWrap] = useState(cfg.wordWrap);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }, [children]);

  const exceedsLimit = cfg.heightLimit > 0 && children.length > cfg.heightLimit;

  if (highlighter) {
    return (
      <HighlightedCodeBlock
        children={children}
        language={language}
        highlighter={highlighter}
        cfg={cfg}
        collapsed={collapsed}
        wrap={wrap}
        copied={copied}
        exceedsLimit={exceedsLimit}
        onCopy={handleCopy}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggleWrap={() => setWrap(!wrap)}
      />
    );
  }

  return (
    <PlainCodeBlock
      children={children}
      language={language}
      cfg={cfg}
      collapsed={collapsed}
      copied={copied}
      exceedsLimit={exceedsLimit}
      onCopy={handleCopy}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    />
  );
}

export function MarkdownRenderer({ content, highlight: highlightProp }: MarkdownRendererProps) {
  const cfg: HighlightConfig = {
    theme: 'dark',
    copy: true,
    lang: true,
    shrink: false,
    heightLimit: 330,
    wordWrap: true,
    ...highlightProp,
  };

  const [highlighter, setHighlighter] = useState<{
    Component: ComponentType<HighlighterProps>;
    style: Record<string, React.CSSProperties>;
  } | null>(null);

  useEffect(() => {
    const themeName = resolveTheme(cfg.theme);
    Promise.all([
      import('react-syntax-highlighter/dist/esm/prism'),
      import('react-syntax-highlighter/dist/esm/styles/prism'),
    ]).then(([prismMod, stylesMod]) => {
      const mod = stylesMod as Record<string, Record<string, React.CSSProperties>>;
      const style: Record<string, React.CSSProperties> = mod[themeName] ?? mod.vscDarkPlus ?? {};
      setHighlighter({
        Component: prismMod.default as ComponentType<HighlighterProps>,
        style,
      });
    }).catch((error) => {
      console.error('代码高亮模块加载失败，降级为普通代码块:', error);
    });
  }, [cfg.theme]);

  const components: Record<string, ComponentType<CodeProps>> = {
    code({ inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className ?? '');
      if (!inline && match) {
        return (
          <CodeBlock
            children={String(children).replace(/\n$/, '')}
            language={match[1] ?? ''}
            highlighter={highlighter}
            cfg={cfg}
          />
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
