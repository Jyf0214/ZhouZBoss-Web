'use client';
import { useEffect } from 'react';
import { onLCP, onINP, onCLS, onTTFB, type Metric } from 'web-vitals';

// 批量上报 web vitals 指标
export function useWebVitals() {
  useEffect(() => {
    const report = (metric: Metric) => {
      // 使用 sendBeacon 上报，不阻塞页面
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      });
      navigator.sendBeacon('/api/web-vitals', body);
    };

    onLCP(report);
    onINP(report);
    onCLS(report);
    onTTFB(report);
  }, []);
}
