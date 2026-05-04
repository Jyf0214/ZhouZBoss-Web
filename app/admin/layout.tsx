'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { Sidebar } from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isSudo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isSudo) {
        router.push('/dashboard');
      }
    }
  }, [user, isSudo, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!user || !isSudo) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-zinc-50">
        {children}
      </main>
    </div>
  );
}
