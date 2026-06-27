'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, WrapText } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import type { HighlightConfig, HighlighterInstance } from './types';

function CodeToolbar({
  language,
  cfg,
  copied,
  copyError,
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
  copyError: boolean;
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
          <Tag size="xs" variant="dark">
            {language}
          </Tag>
        )}
        {copyError && (
          <span className="text-xs text-red-400 animate-pulse">复制失败</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {cfg.copy && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
            onClick={onCopy}
            title="复制代码"
            aria-label="复制代码"
          />
        )}
        {showWrap && cfg.wordWrap && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            icon={<WrapText size={14} />}
            className={wrap ? 'text-zinc-200 bg-zinc-700' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'}
            onClick={onToggleWrap}
            title="自动换行"
            aria-label="自动换行"
          />
        )}
        {exceedsLimit && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            icon={collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
            onClick={onToggleCollapse}
            title={collapsed ? '展开' : '折叠'}
            aria-label={collapsed ? '展开代码' : '折叠代码'}
          />
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
  copyError,
  exceedsLimit,
  onCopy,
  onToggleCollapse,
  onToggleWrap,
}: {
  children: string;
  language: string;
  highlighter: HighlighterInstance;
  cfg: HighlightConfig;
  collapsed: boolean;
  wrap: boolean;
  copied: boolean;
  copyError: boolean;
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
        copyError={copyError}
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
  copyError,
  exceedsLimit,
  onCopy,
  onToggleCollapse,
}: {
  children: string;
  language: string;
  cfg: HighlightConfig;
  collapsed: boolean;
  copied: boolean;
  copyError: boolean;
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
        copyError={copyError}
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

export function CodeBlock({
  children,
  language,
  highlighter,
  cfg,
}: {
  children: string;
  language: string;
  highlighter: HighlighterInstance | null;
  cfg: HighlightConfig;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [collapsed, setCollapsed] = useState(cfg.shrink);
  const [wrap, setWrap] = useState(cfg.wordWrap);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 组件卸载时清理定时器，避免对已卸载组件调用 setState
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopyError(true);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setCopyError(false), 2000);
    });
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
        copyError={copyError}
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
      copyError={copyError}
      exceedsLimit={exceedsLimit}
      onCopy={handleCopy}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    />
  );
}
