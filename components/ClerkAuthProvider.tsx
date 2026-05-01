'use client';

import { ClerkProvider, useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';

/**
 * Clerk 认证提供者包装器
 * 仅在配置了 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 时启用
 * 未配置时直接透传 children，不加载任何 Clerk 代码
 */
export function ClerkAuthProvider({
  children,
  onSignOutReady,
}: {
  children: React.ReactNode;
  onSignOutReady?: (signOut: (() => Promise<void>)) => void;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // 无 key 时不渲染 ClerkProvider，避免运行时报错
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/clerk/sign-in"
      signUpUrl="/clerk/sign-up"
    >
      {onSignOutReady && <ClerkSignOutBridge onSignOutReady={onSignOutReady} />}
      {children}
    </ClerkProvider>
  );
}

/** 在 ClerkProvider 内部调用 useClerk，获取 signOut */
function ClerkSignOutBridge({
  onSignOutReady,
}: {
  onSignOutReady: (signOut: (() => Promise<void>)) => void;
}) {
  const { signOut } = useClerk();

  useEffect(() => {
    if (signOut) {
      onSignOutReady(signOut);
    }
  }, [signOut, onSignOutReady]);

  return null;
}
