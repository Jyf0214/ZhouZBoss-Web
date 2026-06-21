'use client';
import { useEffect, useRef } from 'react';

export function HeadInjector({ content }: { content: string }) {
  const injectedRef = useRef<Node[]>([]);

  useEffect(() => {
    // 清理之前的注入元素
    for (const node of injectedRef.current) {
      node.parentNode?.removeChild(node);
    }
    injectedRef.current = [];

    if (!content) return;

    // 创建临时容器解析 HTML
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const children = Array.from(temp.childNodes);

    // 逐个注入并记录引用
    for (const child of children) {
      document.head.appendChild(child);
      injectedRef.current.push(child);
    }
  }, [content]);

  return null;
}
