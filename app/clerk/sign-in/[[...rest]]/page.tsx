'use client';

import { useEffect, useState, createElement } from 'react';
import { loadClerkClient } from '@/lib/clerk-dynamic';

/**
 * Clerk 登录页面 — 组件通过运行时动态导入加载
 */
export default function ClerkSignInPage() {
  const [SignInComp, setSignInComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadClerkClient()
      .then((mod) => {
        if (!mod) return;
        const clerkModule = mod as { SignIn: React.ComponentType<Record<string, unknown>> };
        if (clerkModule.SignIn) setSignInComp(() => clerkModule.SignIn);
      })
      .catch(() => { setLoadError(true); });
  }, []);

  if (!SignInComp) {
    if (loadError) {
      return (
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">Clerk 加载失败，请刷新重试</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors">
                刷新页面
              </button>
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-zinc-400 dark:text-zinc-500">正在加载 Clerk...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
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
