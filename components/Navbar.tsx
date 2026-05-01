'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { SignInButton, useClerk } from '@clerk/nextjs';
import { LogoutOutlined, LoginOutlined, SettingOutlined, UserOutlined, UsergroupAddOutlined, BookOutlined, TeamOutlined } from '@ant-design/icons';
import { Tag, Button } from 'antd';
import { Flexbox, Text } from '@lobehub/ui';

export function Navbar() {
  const { user, userRole, logout, clerkAvailable } = useAuth();
  const isSudo = userRole === 'sudo' || userRole === 'admin';
  const userUid = user?.uid || '';
  const clerk = useClerk();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg leading-none">O</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-zinc-900">Originium Kernel</span>
            </Link>
            {/* 导航链接 */}
            <div className="hidden md:flex items-center gap-1 ml-8">
              <Link href="/posts">
                <Button type="text" icon={<BookOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900">
                  帖子
                </Button>
              </Link>
              <Link href="/faces">
                <Button type="text" icon={<TeamOutlined />} size="small" className="text-zinc-500 hover:text-zinc-900">
                  通讯录
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Flexbox horizontal align="center" gap={12}>
                <Flexbox horizontal align="center" gap={8}>
                  <div className="w-9 h-9 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-full flex items-center justify-center border border-zinc-200">
                    <UserOutlined className="text-zinc-500" />
                  </div>
                  <div className="hidden md:block">
                    <Flexbox horizontal align="center" gap={6}>
                      <Text weight={500} style={{ fontSize: 14, lineHeight: 1.2 }}>{user.displayName}</Text>
                      {isSudo && (
                        <Tag color="gold" className="shrink-0 text-xs" style={{ borderRadius: 6 }}>Sudo</Tag>
                      )}
                    </Flexbox>
                    <Flexbox horizontal align="center" gap={6}>
                      <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>{userUid}</Text>
                      {user.userGroup && (
                        <Tag color="blue" className="shrink-0 text-xs" style={{ borderRadius: 6 }}>{user.userGroup}</Tag>
                      )}
                    </Flexbox>
                  </div>
                </Flexbox>
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
              </Flexbox>
            ) : (
              <>
                <Link href="/login">
                  <Button type="text" size="large" className="text-zinc-600 hover:text-zinc-900">
                    登录
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="large" className="bg-zinc-900 text-white hover:bg-zinc-800 border-0 rounded-xl px-6">
                    <Flexbox horizontal align="center" gap={6}>
                      <LoginOutlined />
                      <span>注册</span>
                    </Flexbox>
                  </Button>
                </Link>
                {clerkAvailable && !clerk.user && (
                  <SignInButton mode="modal" fallbackRedirectUrl="/clerk/after-auth">
                    <Button size="large" className="border-zinc-200 hover:border-zinc-300 rounded-xl px-4">
                      <Flexbox horizontal align="center" gap={6}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9.5 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="#6C47FF"/>
                        </svg>
                        <span>Clerk</span>
                      </Flexbox>
                    </Button>
                  </SignInButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
