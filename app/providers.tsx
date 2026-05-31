'use client';

import { ConfigProvider } from '@/components/ConfigProvider';
import { BackgroundProvider } from '@/components/BackgroundProvider';
import { FontSizeProvider } from '@/components/FontSizeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <BackgroundProvider>
        <FontSizeProvider>
          {children}
        </FontSizeProvider>
      </BackgroundProvider>
    </ConfigProvider>
  );
}
