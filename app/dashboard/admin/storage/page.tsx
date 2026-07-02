/**
 * /admin/storage 入口 — 鉴权检查 + 委托到 Shell
 */
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { GlobalLoading } from '@/components/Loading';
import { StorageAdminShell } from './_components/StorageAdminShell';

export default function StoragePage() {
  const { isSudo, loading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!isSudo && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/dashboard');
    }
  }, [loading, isSudo, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-900">
        <GlobalLoading size="large" />
      </div>
    );
  }

  if (!isSudo) return null;

  return <StorageAdminShell />;
}
