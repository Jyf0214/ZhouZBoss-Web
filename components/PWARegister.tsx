'use client';

import { useEffect } from 'react';

/**
 * PWA Service Worker 注册组件
 * 静默注册，不显示更新提示
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // 监听新 SW 激活，静默切换
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新 SW 已就绪，静默跳过等待直接激活
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        // 注册失败不影响正常使用，仅记录
        console.warn('[PWA] Service Worker 注册失败:', err);
      });

    // 监听控制器变更（新 SW 接管），静默处理
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      // 静默刷新页面以加载新缓存
      window.location.reload();
    });
  }, []);

  return null;
}
