'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { HighlightConfig, HighlighterInstance, HighlighterProps } from './types';
import { resolveTheme } from './renderer-config';

/** 解析后的高亮配置 + 异步加载的语法高亮器实例 */
export interface UseMarkdownConfigResult {
  cfg: HighlightConfig;
  highlighter: HighlighterInstance | null;
}

/**
 * 解析 highlight 配置并按需加载语法高亮模块。
 * - cfg.theme 变化时重新加载高亮主题。
 * - 加载失败时降级为 null，由 CodeBlock 走 PlainCodeBlock 路径。
 * - 使用 mountedRef 丢弃卸载后的异步结果，使用 themeRef 丢弃过时的主题结果。
 */
export function useMarkdownConfig(
  highlightProp: HighlightConfig | undefined,
): UseMarkdownConfigResult {
  const cfg: HighlightConfig = {
    theme: 'dark',
    copy: true,
    lang: true,
    shrink: false,
    heightLimit: 330,
    wordWrap: true,
    ...highlightProp,
  };

  const [highlighter, setHighlighter] = useState<HighlighterInstance | null>(null);
  const mountedRef = useRef(true);
  const themeRef = useRef(cfg.theme);

  useEffect(() => {
    mountedRef.current = true;
    themeRef.current = cfg.theme;

    const themeName = resolveTheme(cfg.theme);
    Promise.all([
      import('react-syntax-highlighter/dist/esm/prism'),
      import('react-syntax-highlighter/dist/esm/styles/prism'),
    ]).then(([prismMod, stylesMod]) => {
      // 丢弃卸载后的结果
      if (!mountedRef.current) return;
      // 丢弃过时主题的结果（组件期间 theme 又变了）
      if (themeRef.current !== cfg.theme) return;

      const mod = stylesMod as Record<string, Record<string, React.CSSProperties>>;
      const style: Record<string, React.CSSProperties> = mod[themeName] ?? mod.vscDarkPlus ?? {};
      setHighlighter({
        Component: prismMod.default as ComponentType<HighlighterProps>,
        style,
      });
    }).catch((error) => {
      if (!mountedRef.current) return;
      console.error('代码高亮模块加载失败，降级为普通代码块:', error);
    });

    return () => { mountedRef.current = false; };
  }, [cfg.theme]);

  return { cfg, highlighter };
}
