'use client';

import { useEffect } from 'react';

/**
 * 从运行时配置读取 fontSize 并设置为 CSS 变量 --base-font-size
 * 该变量在 globals.css 中被 html 字号引用
 */
export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyFontSize = async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        const size = data?.appearance?.fontSize;
        if (typeof size === 'number' && size >= 10 && size <= 30) {
          document.documentElement.style.setProperty('--base-font-size', `${size}px`);
        }
      } catch {
        // 静默失败，使用 CSS 默认值
      }
    };
    void applyFontSize();
  }, []);

  return <>{children}</>;
}
