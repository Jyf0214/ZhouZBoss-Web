'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// 禁止静态预渲染，必须在 ClerkProvider 运行时环境中渲染
export const dynamic = 'force-dynamic';
import { Navbar } from '@/components/Navbar';
import { Spin, Button } from 'antd';
import { Link, ExternalLink } from 'lucide-react';

/**
 * Clerk 登录后处理页面
 * 检查用户是否已绑定 Originium Kernel 账户
 * - 已绑定 → 创建 JWT session → 跳转 dashboard
 * - 未绑定 → 引导绑定
 */
export default function ClerkAfterAuthPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isBound, setIsBound] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkBinding = async () => {
      try {
        const res = await fetch('/api/auth/clerk-check');
        if (res.ok) {
          const data = await res.json();
          if (data.bound) {
            setIsBound(true);
            router.push('/dashboard');
            return;
          }
        }
      } catch {
        // 检查失败，继续显示绑定选项
      }
      setChecking(false);
    };

    checkBinding();
  }, [isLoaded, user, router]);

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Link size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            登录成功
          </h1>
          <p className="text-zinc-400 mb-8">
            是否绑定已有的 Originium Kernel 账户？
          </p>
          <div className="space-y-3">
            <Button
              type="primary"
              size="large"
              block
              className="h-12 rounded-xl bg-zinc-900"
              onClick={() => router.push('/clerk/bind')}
            >
              绑定已有账户
            </Button>
            <Button
              size="large"
              block
              className="h-12 rounded-xl"
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