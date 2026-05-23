'use client';

import { useEffect, useState } from 'react';

interface ErrorImgConfig {
  flink: string;
  postPage: string;
}

let cachedConfig: ErrorImgConfig | null = null;

function getHandler(type: 'flink' | 'postPage'): (e: React.SyntheticEvent<HTMLImageElement>) => void {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (cachedConfig?.[type]) {
      (e.target as HTMLImageElement).src = cachedConfig[type];
    }
  };
}

export function useErrorImg() {
  const [loaded, setLoaded] = useState(!!cachedConfig);

  useEffect(() => {
    if (cachedConfig) { setLoaded(true); return; }
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          cachedConfig = data.errorImg as ErrorImgConfig;
          setLoaded(true);
        }
      } catch {}
    };
    void fetchConfig();
  }, []);

  return {
    loaded,
    onPostError: getHandler('postPage'),
    onFlinkError: getHandler('flink'),
  };
}
