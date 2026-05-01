'use client';

import { ClerkProvider, useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';

/**
 * Clerk 认证提供者包装器
 * 仅在配置了 Clerk 环境变量时启用
 * 内置 ClerkSync 组件，将 signOut 传递给外部
 */
export function ClerkAuthProvider({
  children,
  onSignOutReady,
}: {
  children: React.ReactNode;
  onSignOutReady?: (signOut: (() => Promise<void>)) => void;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
