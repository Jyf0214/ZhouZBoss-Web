'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import { LogoutOutlined, LoginOutlined, SettingOutlined, UserOutlined, UsergroupAddOutlined, BookOutlined, TeamOutlined } from '@ant-design/icons';
import { Tag, Button } from 'antd';
import { useI18n } from '@/hooks/use-i18n';

export function Navbar() {
  const { user, userRole, logout, clerkAvailable } = useAuth();
  const { t } = useI18n();
  const isSudo = userRole === 'sudo' || userRole === 'admin';
  const userUid = user?.uid || '';

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg leading-none">O</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-zinc-900">{t('sidebar.originiumKernel')}</span>
            </Link>
            <div className="hidden md:flex items-center gap-1 ml-8">
              <Link href="/posts">
                <Button type="text" icon={<BookOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900">
                  {t('nav.posts')}
                </Button>
              </Link>
              <Link href="/faces">
                <Button type="text" icon={<TeamOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900">
                  {t('nav.faces')}
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar name={user.name} avatarUrl={user.avatar} size={36} />
                  <div className="hidden md:block">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-zinc-900 leading-tight">{user.displayName}</span>
                      {isSudo && (
                        <Tag color="gold" className="shrink-0 text-xs" style={{ borderRadius: 6 }}>{t('user.sudo')}</Tag>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-400 font-mono leading-tight">{userUid}</span>
                      {user.userGroup && (
                        <Tag color="blue" className="shrink-0 text-xs" style={{ borderRadius: 6 }}>{user.userGroup}</Tag>
                      )}
                    </div>
                  </div>
                </div>
                {isSudo && (
                  <>
                    <Link href="/admin/groups">
                      <Button type="text" icon={<UsergroupAddOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900" />
                    </Link>
                    <Link href="/admin/users">
                      <Button type="text" icon={<SettingOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900" />
                    </Link>
                  </>
                )}
                <Link href="/dashboard">
                  <Button type="text" icon={<SettingOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900" />
                </Link>
                <Button type="text" icon={<LogoutOutlined />} onClick={logout} size="small" className="text-zinc-500 hover:text-zinc-900" />
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button type="text" size="large" className="text-zinc-600 hover:text-zinc-900">
                    {t('auth.login')}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="large" className="bg-zinc-900 text-white hover:bg-zinc-800 border-0 rounded-xl px-6">
                    <span className="flex items-center gap-1.5">
                      <LoginOutlined />
                      <span>{t('auth.register')}</span>
                    </span>
                  </Button>
                </Link>
                {clerkAvailable && (
                  <ClerkAuthProvider>
                    <ClerkLoginSection variant="compact" />
                  </ClerkAuthProvider>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
