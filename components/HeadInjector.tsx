'use client';

import { useEffect, useRef } from 'react';

export function HeadInjector({ content }: { content: string }) {
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    if (!content) return;

    // 清理上次注入的节点
    for (const node of nodesRef.current) {
      node.parentNode?.removeChild(node);
    }
    nodesRef.current = [];

    // 创建临时容器解析 HTML，将子节点逐个注入 head
    const container = document.createElement('div');
    container.innerHTML = content;
    const injected: Node[] = [];
    while (container.firstChild) {
      const child = container.firstChild;
      document.head.appendChild(child);
      injected.push(child);
    }
    nodesRef.current = injected;

    return () => {
      for (const node of nodesRef.current) {
        node.parentNode?.removeChild(node);
      }
      nodesRef.current = [];
    };
  }, [content]);

  return null;
}
