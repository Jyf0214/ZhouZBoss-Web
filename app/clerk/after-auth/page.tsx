'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { Link as LinkIcon } from 'lucide-react';
import { isClerkConfigured } from '@/lib/clerk-dynamic';

/**
 * Clerk 登录后处理页面
 * 检查用户是否已绑定 Originium Kernel 账户
 * 通过 API 查询绑定状态，无需客户端 Clerk hook
 */
export default function ClerkAfterAuthPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isClerkConfigured()) {
      router.replace('/login');
      return;
    }

    const checkBinding = async () => {
      try {
        const res = await fetch('/api/auth/clerk-check');
        if (res.ok) {
          const data = await res.json();
          if (data.bound) {
            router.push('/dashboard');
            return;
          }
        } else {
          if (res.status === 400) {
            router.replace('/login');
            return;
          }
          showError('账户检查失败');
        }
      } catch {
        showError('账户检查失败');
      }
      setChecking(false);
    };

    void checkBinding();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
        <main className="flex-1 flex items-center justify-center">
          <GlobalLoading size="large" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-100 dark:border-zinc-700 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LinkIcon size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            登录成功
          </h1>
          <p className="text-zinc-400 dark:text-zinc-500 mb-8">
            是否绑定已有的 Originium Kernel 账户？
          </p>
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              block
              rounded="md"
              autoLoading={false}
              onClick={() => router.push('/clerk/bind')}
            >
              绑定已有账户
            </Button>
            <Button
              variant="default"
              size="lg"
              block
              rounded="md"
              autoLoading={false}
              onClick={() => router.push('/dashboard')}
            >
              跳过，直接进入
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
