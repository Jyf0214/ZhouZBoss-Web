'use client';

import { useEffect, useState, createElement } from 'react';
import { Button } from 'antd';
import { loadClerkClient } from '@/lib/clerk-dynamic';

/**
 * Clerk 登录区块 — 动态加载 Clerk 组件
 *
 * variant="full": 用于登录页，带分隔线和全宽按钮
 * variant="compact": 用于导航栏，紧凑按钮
 */
export function ClerkLoginSection({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const [SignInButtonComp, setSignInButtonComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    loadClerkClient()
      .then((mod) => {
        if (!mod) return;
         
        const Comp = (mod.SignInButton as React.ComponentType<Record<string, unknown>> | undefined);
        if (Comp) {
          setSignInButtonComp(() => Comp);
        }
      })
      .catch(() => { /* Clerk 不可用时静默降级 */ });
  }, []);

  if (!SignInButtonComp) return null;

  if (variant === 'compact') {
    return createElement(
      SignInButtonComp,
      { mode: 'modal', fallbackRedirectUrl: '/clerk/after-auth' },
      <Button size="large" className="border-zinc-200 hover:border-zinc-300 rounded-xl px-4">
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9.5 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="#6C47FF"/>
          </svg>
          <span>Clerk</span>
        </span>
      </Button>,
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400">或</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>
      {createElement(
        SignInButtonComp,
        { mode: 'modal', fallbackRedirectUrl: '/clerk/after-auth' },
        <Button
          block
          size="large"
          className="h-12 rounded-xl border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          <span className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9.5 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="#6C47FF"/>
            </svg>
            使用 Clerk 登录
          </span>
        </Button>,
      )}
    </>
  );
}
