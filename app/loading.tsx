'use client';

import { useEffect, useState } from 'react';
import { GlobalLoading } from '@/components/Loading';

export default function Loading() {
  const [loadingConfig, setLoadingConfig] = useState<{
    page?: { type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd'; color: string; position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' };
    navigation?: { type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd'; color: string };
    slogans?: string[];
  } | undefined>(undefined);

  useEffect(() => {
    const cached = sessionStorage.getItem('loading-config');
    if (cached) {
      try { setLoadingConfig(JSON.parse(cached)); return; } catch { /* ignore */ }
    }
    fetch('/api/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const lc = data?.appearance?.loading;
        if (lc) {
          const config = {
            page: lc.page ? { type: lc.page.type, color: lc.page.color, position: lc.page.position } : undefined,
            navigation: lc.navigation ? { type: lc.navigation.type, color: lc.navigation.color } : undefined,
            slogans: Array.isArray(lc.slogans) ? lc.slogans : undefined,
          };
          setLoadingConfig(config);
          try { sessionStorage.setItem('loading-config', JSON.stringify(config)); } catch { /* ignore */ }
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <GlobalLoading forNavigation loadingConfig={loadingConfig} slogans={loadingConfig?.slogans} />
    </div>
  );
}
