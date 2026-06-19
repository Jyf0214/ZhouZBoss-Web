import type { ComponentType, CSSProperties, ReactNode } from 'react';

/** 代码块高亮配置 */
export interface HighlightConfig {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
}

/** Wiki-link 标题解析映射（小写标题 → URL） */
export type WikiLinkMap = Record<string, { url: string; title: string }>;

/** MarkdownRenderer 组件 props */
export interface MarkdownRendererProps {
  content: string;
  highlight?: HighlightConfig;
  /** 可选：wiki-link 标题解析映射，启用后 [[标题]] 会转为可点击链接 */
  wikiLinkMap?: WikiLinkMap;
}

/** react-syntax-highlighter 组件接收的 props */
export interface HighlighterProps {
  style: Record<string, CSSProperties>;
  language: string;
  PreTag: string;
  className?: string;
  children: string;
  [key: string]: unknown;
}

/** markdown 渲染器透传给组件的通用 props */
export interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}

/** 异步加载的语法高亮器实例 */
export interface HighlighterInstance {
  Component: ComponentType<HighlighterProps>;
  style: Record<string, CSSProperties>;
}
