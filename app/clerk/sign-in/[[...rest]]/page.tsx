'use client';

import { useEffect, useState, createElement } from 'react';
import { loadClerkClient } from '@/lib/clerk-dynamic';

/**
 * Clerk 登录页面 — 组件通过运行时动态导入加载
 */
export default function ClerkSignInPage() {
  const [SignInComp, setSignInComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    loadClerkClient()
      .then((mod) => {
        if (!mod) return;
        const clerkModule = mod as { SignIn: React.ComponentType<Record<string, unknown>> };
        if (clerkModule.SignIn) setSignInComp(() => clerkModule.SignIn);
      })
      .catch(() => { /* Clerk 不可用时静默降级 */ });
  }, []);

  if (!SignInComp) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-zinc-400">正在加载 Clerk...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="flex-1 flex items-center justify-center p-6">
        {createElement(SignInComp, {
          routing: 'path',
          path: '/clerk/sign-in',
          signUpUrl: '/clerk/sign-up',
          fallbackRedirectUrl: '/clerk/after-auth',
        })}
      </main>
    </div>
  );
}
