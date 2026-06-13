'use client';

import { useEffect, useState, createElement } from 'react';
import { useConfig } from '@/hooks/use-config';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { loadClerkClient } from '@/lib/clerk-dynamic';

/**
 * Clerk 注册页面 — 组件通过运行时动态导入加载
 */
export default function ClerkSignUpPage() {
  const { config, loading } = useConfig();
  const { t } = useI18n();
  const allowRegistration = config?.auth?.allowRegistration !== false;
  const [SignUpComp, setSignUpComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    loadClerkClient()
      .then((mod) => {
        if (!mod) return;
         
        const Comp = (mod.SignUp as React.ComponentType<Record<string, unknown>> | undefined);
        if (Comp) setSignUpComp(() => Comp);
      })
      .catch(() => { /* Clerk 不可用时静默降级 */ });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
      </div>
    );
  }

  if (!allowRegistration) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-zinc-500 mb-1">{t('config.registrationClosed')}</p>
            <p className="text-zinc-400 text-sm mb-4">{t('config.registrationClosedHint')}</p>
            <Link href="/login">
              <Button variant="primary">{t('auth.login')}</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className="flex-1 flex items-center justify-center p-6">
        {SignUpComp
          ? createElement(SignUpComp, {
              routing: 'path',
              path: '/clerk/sign-up',
              signInUrl: '/clerk/sign-in',
              fallbackRedirectUrl: '/clerk/after-auth',
            })
          : <div className="text-zinc-400">正在加载 Clerk...</div>
        }
      </main>
    </div>
  );
}
