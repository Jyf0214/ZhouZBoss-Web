'use client';

import { useEffect, useState, createElement, type ReactNode } from 'react';
import { isClerkConfigured, loadClerkClient } from '@/lib/clerk-dynamic';

/**
 * Clerk 认证提供者包装器
 * 仅在配置了 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 时启用
 * Clerk 模块通过运行时动态导入加载，不强制依赖
 */
export function ClerkAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ClerkProviderComp, setClerkProviderComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isClerkConfigured()) {
      setLoading(false);
      return;
    }
    loadClerkClient()
      .then((mod) => {
        if (!mod) return;
        const Comp = mod.ClerkProvider as React.ComponentType<Record<string, unknown>> | undefined;
        if (Comp) {
          setClerkProviderComp(() => Comp);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading || !ClerkProviderComp) {
    return <>{children}</>;
  }

  const providerProps: Record<string, unknown> = {
    signInUrl: '/clerk/sign-in',
    signUpUrl: '/clerk/sign-up',
  };
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    providerProps.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  return createElement(ClerkProviderComp, providerProps, children);
}
