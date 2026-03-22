'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}>
        <span>加载中...</span>
      </div>
    );
  }

  if (!user || !isSudo) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 240,
        minHeight: '100vh',
        background: 'var(--ant-color-bg-layout)',
      }}
      className="dashboard-main"
      >
        {children}
      </main>
      <style jsx>{`
        @media (max-width: 768px) {
          .dashboard-main {
            margin-left: 0 !important;
            padding-top: 60px;
          }
        }
      `}</style>
    </div>
  );
}
