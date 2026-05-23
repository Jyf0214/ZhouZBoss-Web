'use client';

import { SignUp } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { useConfig } from '@/hooks/use-config';
import Link from 'next/link';
import { Button } from 'antd';
import { useI18n } from '@/hooks/use-i18n';

/**
 * Clerk 注册页面
 */
export default function ClerkSignUpPage() {
  const { config, loading } = useConfig();
  const { t } = useI18n();
  const allowRegistration = config?.auth?.allowRegistration !== false;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
      </div>
    );
  }

  if (!allowRegistration) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-zinc-500 mb-1">{t('config.registrationClosed')}</p>
            <p className="text-zinc-400 text-sm mb-4">{t('config.registrationClosedHint')}</p>
            <Link href="/login">
              <Button type="primary">{t('auth.login')}</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <SignUp
          routing="path"
          path="/clerk/sign-up"
          signInUrl="/clerk/sign-in"
          fallbackRedirectUrl="/clerk/after-auth"
        />
      </main>
    </div>
  );
}