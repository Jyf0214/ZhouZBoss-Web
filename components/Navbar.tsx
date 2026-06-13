'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserMenu } from '@/components/UserMenu';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import { LoginOutlined } from '@ant-design/icons';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useConfig } from '@/hooks/use-config';
import { Clock, MapPin, Search } from 'lucide-react';
import type { NavConfig } from '@/lib/config-schema';

// 搜索弹窗动态导入，避免首屏加载无关代码
const SearchDialog = dynamic(
  () => import('@/components/SearchDialog').then((m) => ({ default: m.SearchDialog })),
  { ssr: false },
);

// 服务端传入的导航配置 props
interface NavbarProps {
  navConfig?: NavConfig;
  siteTitle?: string;
}

function NavMenuGroupComponent({ config }: { config: NavConfig | null }) {
  if (!config?.enable || !config.menu?.length) return null;
  return (
    <div className="hidden md:flex items-center gap-1 ml-8">
      {config.menu.map((group, gi) => (
        <React.Fragment key={gi}>
          {group.item.map((item, ii) => (
            <Link key={`${gi}-${ii}`} href={item.link}>
              <Button variant="ghost" size="sm" className="text-zinc-500">
                {item.icon && <img src={item.icon} alt="" className="w-4 h-4" />}
                {item.name}
              </Button>
            </Link>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function NavClock({ travelling, clock, time }: { travelling?: boolean; clock?: boolean; time: string }) {
  return (
    <>
      {travelling && (
        <span className="hidden md:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
          <MapPin size={12} />
          旅行中
        </span>
      )}
      {clock && time && (
        <span className="hidden md:flex items-center gap-1 text-xs text-zinc-400 font-mono">
          <Clock size={12} />
          {time}
        </span>
      )}
    </>
  );
}

function NavAuthSection({ user, allowRegistration, clerkAvailable, t }: { user: unknown; allowRegistration: boolean; clerkAvailable: boolean; t: (key: string) => string }) {
  if (user) return <UserMenu />;
  return (
    <>
      <Link href="/login">
        <Button variant="ghost" size="md" className="text-zinc-600">
          {t('auth.login')}
        </Button>
      </Link>
      {allowRegistration && (
        <Link href="/login">
          <Button variant="primary" size="lg">
            <span className="flex items-center gap-1.5">
              <LoginOutlined />
              <span>{t('auth.register')}</span>
            </span>
          </Button>
        </Link>
      )}
      {clerkAvailable && allowRegistration && (
        <ClerkAuthProvider>
          <ClerkLoginSection variant="compact" />
        </ClerkAuthProvider>
      )}
    </>
  );
}

export function Navbar({ navConfig: navConfigProp, siteTitle: _siteTitle }: NavbarProps) {
  const { user, clerkAvailable } = useAuth();
  const { t } = useI18n();
  const { config: siteConfig } = useConfig();
  // 优先使用服务端传入的配置，无则初始化为 null（降级 fetch 填充）
  const [navConfig, setNavConfig] = useState<NavConfig | null>(navConfigProp ?? null);
  const [time, setTime] = useState('');
  const allowRegistration = siteConfig?.auth?.allowRegistration !== false;
  const [searchOpen, setSearchOpen] = useState(false);

  // 键盘快捷键：Ctrl+K / Cmd+K 打开搜索
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 仅在服务端未传入配置时，降级为客户端 fetch 获取导航配置
  useEffect(() => {
    if (navConfigProp) return; // 已有服务端数据，跳过请求
    const fetchNav = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.nav) {
            setNavConfig(data.nav);
          }
        } else {
          console.warn('导航配置获取失败:', res.status);
        }
      } catch {
        console.warn('导航配置请求异常，使用默认导航');
      }
    };
    void fetchNav();
  }, [navConfigProp]);

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
            <NavMenuGroupComponent config={navConfig} />
          </div>
          <div className="flex items-center gap-3">
            {/* 搜索按钮 */}
            <Button
              onClick={() => setSearchOpen(true)}
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Search size={18} />}
              aria-label="搜索"
            />
            <NavClock travelling={navConfig?.travelling} clock={navConfig?.clock} time={time} />
            <NavAuthSection user={user} allowRegistration={allowRegistration} clerkAvailable={clerkAvailable} t={t} />
          </div>
        </div>
      </div>
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </nav>
  );
}
