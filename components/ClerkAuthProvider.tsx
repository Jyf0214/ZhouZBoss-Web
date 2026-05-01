'use client';

import { ClerkProvider } from '@clerk/nextjs';

/**
 * Clerk 认证提供者包装器
 * 仅在配置了 Clerk 环境变量时启用
 */
export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
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
      {children}
    </ClerkProvider>
  );
}