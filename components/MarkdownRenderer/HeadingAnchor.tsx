import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'lucide-react';
import type { CodeProps } from './types';
import { slugify } from '@/lib/slugify';

/** 从 React children 中提取纯文本，用于生成标题 id */
export function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map((child) => extractTextContent(child)).join('');
  }
  if (React.isValidElement(children)) {
    return extractTextContent((children.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/** 创建带锚点 id 的标题组件（h2/h3 额外支持悬停复制链接） */
export function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const tag = `h${level}`;
  const showAnchor = level === 2 || level === 3;

  if (!showAnchor) {
    return function Heading({ children, node: _node, inline: _inline, ...props }: CodeProps) {
      const id = slugify(extractTextContent(children));
      return React.createElement(tag, { id, ...props }, children);
    };
  }

  return function Heading({ children, node: _node, inline: _inline, ...props }: CodeProps) {
    const id = slugify(extractTextContent(children));
    const [toastVisible, setToastVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // 组件卸载时清理定时器，避免对已卸载组件调用 setState
    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    const handleCopyAnchor = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = window.location.href.split('#')[0] + '#' + id;
      navigator.clipboard.writeText(url).then(() => {
        setToastVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setToastVisible(false), 2000);
      }).catch(() => {
        /* 剪贴板写入失败时静默忽略 */
      });
    }, [id]);

    return React.createElement(
      'div',
      { className: 'group relative' },
      React.createElement(tag, { id, ...props }, children),
      React.createElement(
        'button',
        {
          onClick: handleCopyAnchor,
          className: 'anchor-copy-btn',
          'aria-label': '复制标题链接',
          title: '复制链接',
        },
        React.createElement(Link, { size: 14, strokeWidth: 2.5 }),
      ),
      toastVisible &&
        React.createElement(
          'span',
          { className: 'anchor-copy-toast' },
          '链接已复制',
        ),
    );
  };
}
