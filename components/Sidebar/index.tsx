'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Home,
  BookOpen,
  Users,
  PenLine,
  Archive,
  Trash2,
  Settings,
  Activity,
  FileText,
  Menu,
  X,
  ChevronDown,
  Eye,
  LogOut,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher/index';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/Button';

type SidebarVariant = 'user' | 'admin';

interface MenuItem {
  key: string;
  icon: React.ElementType;
  href: string;
  group: string;
}

const userMenuItems: MenuItem[] = [
  { key: 'sidebar.dashboard', icon: Home, href: '/dashboard', group: 'overview' },
  { key: 'sidebar.posts', icon: BookOpen, href: '/posts', group: 'content' },
  { key: 'sidebar.faces', icon: Users, href: '/faces', group: 'content' },
  { key: 'sidebar.write', icon: PenLine, href: '/editor', group: 'content' },
  { key: 'sidebar.articleManagement', icon: Archive, href: '/dashboard/articles', group: 'manage' },
  { key: 'sidebar.trash', icon: Trash2, href: '/dashboard/articles?status=pending_deletion', group: 'manage' },
  { key: 'sidebar.diary', icon: FileText, href: '/diary', group: 'personal' },
  { key: 'sidebar.settings', icon: Settings, href: '/dashboard/settings', group: 'account' },
];

const adminMenuItems: MenuItem[] = [
  { key: 'sidebar.returnDashboard', icon: ArrowLeft, href: '/dashboard', group: 'back' },
  { key: 'sidebar.systemConfig', icon: Settings, href: '/admin/config', group: 'admin' },
  { key: 'sidebar.configPreview', icon: Eye, href: '/admin/config/preview', group: 'admin' },
  { key: 'sidebar.envVariables', icon: Activity, href: '/admin/env', group: 'admin' },
  { key: 'sidebar.userManagement', icon: Users, href: '/admin/users', group: 'admin' },
  { key: 'sidebar.tickets', icon: FileText, href: '/admin/tickets', group: 'admin' },
  { key: 'sidebar.writeArticle', icon: FileText, href: '/admin/tickets/new', group: 'admin' },
];

const groupKeys: Record<string, string> = {
  back: 'sidebar.returnDashboard',
  overview: 'dashboard.overview',
  content: 'dashboard.contentManagement',
  manage: 'dashboard.articles',
  personal: 'dashboard.personal',
  account: 'user.settings',
  admin: 'dashboard.adminConsole',
};

function SidebarContent({
  items,
  isActive,
  onItemClick,
  user,
  onLogout,
  showCloseButton,
  onClose,
  t,
}: {
  items: MenuItem[];
  isActive: (href: string) => boolean;
  onItemClick: () => void;
  user?: { name?: string; avatar?: string; role?: string };
  onLogout: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  t: (key: string) => string;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const getGroupLabel = (group: string) => {
    return t(groupKeys[group] ?? group);
  };

  // 按分组整理菜单
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const g = item.group ?? 'other';
    acc[g] ??= [];
    acc[g].push(item);
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-zinc-100">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between border-b border-zinc-50/50">
        <Link href="/" className="flex items-center gap-3 group no-underline">
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200 group-hover:scale-105 transition-transform duration-300">
            <span className="text-white font-black text-lg tracking-tighter">OK</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-zinc-900 leading-none mb-0.5">
              Originium
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              Kernel
            </span>
          </div>
        </Link>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 用户区域 */}
      <div className="p-4 space-y-4 bg-zinc-50/50 border-b border-zinc-100">
        <div className="px-2">
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-zinc-100 shadow-sm group">
          <Avatar name={user?.name ?? 'U'} avatarUrl={user?.avatar} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-zinc-900 truncate">
              {user?.name ?? '用户'}
            </div>
            <div className="text-[10px] font-bold text-zinc-400 truncate uppercase tracking-tighter">
              {user?.role === 'sudo' ? t('user.sudo') : user?.role === 'admin' ? t('user.admin') : t('user.user')}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl hover:bg-red-50 transition-all text-zinc-300 hover:text-red-500 shrink-0"
            title={t('auth.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* 菜单 */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-7 custom-scrollbar">
        {Object.entries(grouped).map(([group, groupItems]) => {
          const isCollapsed = collapsedGroups[group];
          const isAdminGroup = group === 'admin';

          return (
            <div key={group} className="space-y-1.5">
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between w-full px-3 mb-1 group/title"
              >
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                    isAdminGroup ? 'text-amber-500' : 'text-zinc-300'
                  }`}
                >
                  {getGroupLabel(group)}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-zinc-200 transition-transform duration-300 ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              {/* 分组菜单项 */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onItemClick}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group/item no-underline ${
                          active
                            ? isAdminGroup
                              ? 'bg-amber-50 text-amber-700 shadow-sm shadow-amber-100/50'
                              : 'bg-zinc-900 text-white shadow-lg shadow-zinc-200'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                        }`}
                      >
                        <Icon
                          size={18}
                          className={`shrink-0 transition-colors ${
                            active
                              ? isAdminGroup
                                ? 'text-amber-600'
                                : 'text-white'
                              : 'text-zinc-300 group-hover/item:text-zinc-500'
                          }`}
                        />
                        <span className={`truncate ${active ? 'font-bold' : 'font-medium'}`}>
                          {t(item.key)}
                        </span>
                        {active && !isAdminGroup && (
                          <div className="ml-auto w-1 h-4 bg-white/20 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

    </div>
  );
}

function Sidebar({ variant = 'user' }: { variant?: SidebarVariant }) {
  const { user, isSudo, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const items = variant === 'admin'
    ? adminMenuItems
    : isSudo
      ? [...userMenuItems, { key: 'dashboard.adminConsole', icon: Settings, href: '/admin', group: 'admin' }]
      : userMenuItems;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const isActive = (href: string) => {
    const [path = ''] = href.split('?');
    if (path === '/dashboard') return pathname === '/dashboard';
    return (pathname ?? '').startsWith(path);
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      {!isOpen && (
        <Button variant="primary"
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed top-6 left-6 z-[9999] rounded-2xl p-3.5 shadow-2xl shadow-zinc-900/20 hover:scale-110 active:scale-95"
        >
          <Menu size={22} />
        </Button>
      )}

      {/* PC 端侧边栏 */}
      <div className="hidden md:flex w-[280px] min-h-screen z-[100] bg-white flex-col">
        <SidebarContent
          items={items}
          isActive={isActive}
          onItemClick={() => setIsOpen(false)}
          user={user ?? undefined}
          onLogout={handleLogout}
          t={t}
        />
      </div>

      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-zinc-900/40 backdrop-blur-md z-[998] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <div
        className="md:hidden fixed top-0 h-screen w-[300px] z-[999] bg-white shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
        style={{ left: 0, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <SidebarContent
          items={items}
          isActive={isActive}
          onItemClick={() => setIsOpen(false)}
          user={user ?? undefined}
          onLogout={handleLogout}
          showCloseButton
          onClose={() => setIsOpen(false)}
          t={t}
        />
      </div>
    </>
  );
}

export { Sidebar };
export default Sidebar;
