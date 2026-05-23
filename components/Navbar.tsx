'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserMenu } from '@/components/UserMenu';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import { LoginOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { Clock, MapPin } from 'lucide-react';

interface NavMenuItem {
  name: string;
  link: string;
  icon?: string;
}

interface NavMenuGroup {
  title: string;
  item: NavMenuItem[];
}

interface NavConfig {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroup[];
}

export function Navbar() {
  const { user, clerkAvailable } = useAuth();
  const { t } = useI18n();
  const [navConfig, setNavConfig] = useState<NavConfig | null>(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.nav) {
            setNavConfig(data.nav);
          }
        }
      } catch {
        // 静默失败，使用默认导航
      }
    };
    void fetchNav();
  }, []);

  useEffect(() => {
    if (!navConfig?.clock) return;
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [navConfig?.clock]);

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
            {navConfig?.enable && navConfig.menu.length > 0 && (
              <div className="hidden md:flex items-center gap-1 ml-8">
                {navConfig.menu.map((group, gi) => (
                  <React.Fragment key={gi}>
                    {group.item.map((item, ii) => (
                      <Link key={`${gi}-${ii}`} href={item.link}>
                        <Button
                          type="text"
                          size="small"
                          className="text-zinc-500 hover:text-zinc-900"
                        >
                          {item.icon && (
                            <img src={item.icon} alt="" className="w-4 h-4" />
                          )}
                          {item.name}
                        </Button>
                      </Link>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {navConfig?.travelling && (
              <span className="hidden md:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                <MapPin size={12} />
                旅行中
              </span>
            )}
            {navConfig?.clock && time && (
              <span className="hidden md:flex items-center gap-1 text-xs text-zinc-400 font-mono">
                <Clock size={12} />
                {time}
              </span>
            )}
            {user ? (
              <UserMenu />
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
