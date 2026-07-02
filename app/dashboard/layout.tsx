'use client';
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import Sidebar from '@/components/Sidebar/index';
import TopHeader from '@/components/TopHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isSudo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center h-screen bg-zinc-50"><GlobalLoading size="large" /></div>;
  }

  // 根据路径和用户角色决定使用哪个侧边栏变体
  // admin 功能保留在 dashboard 路由下，但需要 sudo 角色
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/admin');
  const sidebarVariant = isAdminRoute && isSudo ? 'admin' : 'user';

  return (
    <div className="flex min-h-screen">
      <Sidebar variant={sidebarVariant} />
      <div className="flex-1 flex flex-col min-h-screen bg-zinc-50">
        <TopHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
