'use client';
import { useEffect } from 'react';
import { onLCP, onINP, onCLS, onTTFB, type Metric } from 'web-vitals';

/**
 * 批量上报 web vitals 指标
 *
 * web-vitals v5 的回调为一次性触发（每个指标类型只触发一次），
 * 无需手动取消订阅，不存在 listener 泄漏问题。
 */
export function useWebVitals() {
  useEffect(() => {
    const report = (metric: Metric) => {
      navigator.sendBeacon('/api/web-vitals', JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      }));
    };

    onLCP(report);
    onINP(report);
    onCLS(report);
    onTTFB(report);
  }, []);
}
