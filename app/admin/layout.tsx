'use client';
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import Sidebar from '@/components/Sidebar/index';
import TopHeader from '@/components/TopHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isSudo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) { router.push('/login'); }
      else if (!isSudo) { router.push('/dashboard'); }
    }
  }, [user, isSudo, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }
  if (!user || !isSudo) return null;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar variant="admin" />
      <div className="flex-1 flex flex-col min-h-screen bg-zinc-50 overflow-x-hidden">
        <TopHeader />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
