'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  BookOpen,
  Users,
  PenLine,
  Archive,
  Trash2,
  Settings,
  Shield,
  Activity,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Globe,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher/index';
import { useI18n } from '@/hooks/use-i18n';

interface MenuItem {
  label: string;
  labelEn: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
  group?: string;
}

const menuItems: MenuItem[] = [
  { label: '控制台', labelEn: 'Dashboard', icon: Home, href: '/dashboard', group: 'overview' },
  { label: '帖子', labelEn: 'Posts', icon: BookOpen, href: '/posts', group: 'content' },
  { label: '通讯录', labelEn: 'Faces', icon: Users, href: '/faces', group: 'content' },
  { label: '写文章', labelEn: 'Write', icon: PenLine, href: '/editor', group: 'content' },
  { label: '文章管理', labelEn: 'Articles', icon: Archive, href: '/dashboard/articles', group: 'manage' },
  { label: '回收站', labelEn: 'Trash', icon: Trash2, href: '/dashboard/articles?status=pending_deletion', group: 'manage' },
  { label: '个人设置', labelEn: 'Settings', icon: Settings, href: '/dashboard/settings', group: 'account' },
];

const adminItems: MenuItem[] = [
  { label: '用户管理', labelEn: 'Users', icon: Users, href: '/admin/users', adminOnly: true, group: 'admin' },
  { label: '用户组', labelEn: 'Groups', icon: Shield, href: '/admin/groups', adminOnly: true, group: 'admin' },
  { label: '系统配置', labelEn: 'Config', icon: Settings, href: '/admin/config', adminOnly: true, group: 'admin' },
  { label: '环境变量', labelEn: 'Env', icon: Activity, href: '/admin/env', adminOnly: true, group: 'admin' },
  { label: '工单管理', labelEn: 'Tickets', icon: FileText, href: '/admin/tickets', adminOnly: true, group: 'admin' },
  { label: '新建模板', labelEn: 'New Template', icon: FileText, href: '/admin/tickets/new', adminOnly: true, group: 'admin' },
];

const groupLabels: Record<string, { zh: string; en: string }> = {
  overview: { zh: '概览', en: 'Overview' },
  content: { zh: '内容', en: 'Content' },
  manage: { zh: '管理', en: 'Manage' },
  account: { zh: '账户', en: 'Account' },
  admin: { zh: '管理后台', en: 'Admin' },
};

function SidebarContent({
  items,
  isActive,
  onItemClick,
  user,
  onLogout,
  showCloseButton,
  onClose,
  locale,
}: {
  items: MenuItem[];
  isActive: (href: string) => boolean;
  onItemClick: () => void;
  user: any;
  onLogout: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  locale: string;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const getLabel = (item: MenuItem) => (locale === 'en' ? item.labelEn : item.label);
  const getGroupLabel = (group: string) => {
    const g = groupLabels[group];
    return g ? (locale === 'en' ? g.en : g.zh) : group;
  };

  // 按分组整理菜单
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const g = item.group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm leading-none">O</span>
          </div>
          <span className="font-bold text-base tracking-tight text-zinc-900">
            Originium
          </span>
        </div>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 菜单 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {Object.entries(grouped).map(([group, groupItems]) => {
          const isCollapsed = collapsedGroups[group];
          const isAdminGroup = group === 'admin';

          return (
            <div key={group}>
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between w-full px-2 mb-1.5 group/title"
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                    isAdminGroup ? 'text-amber-600' : 'text-zinc-400'
                  }`}
                >
                  {getGroupLabel(group)}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-zinc-300 transition-transform duration-200 ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              {/* 分组菜单项 */}
              {!isCollapsed && (
                <div className="space-0.5">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onItemClick}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group/item no-underline"
                        style={{
                          background: active
                            ? isAdminGroup
                              ? '#fffbeb'
                              : '#f4f4f5'
                            : 'transparent',
                          color: active
                            ? isAdminGroup
                              ? '#d97706'
                              : '#18181b'
                            : '#71717a',
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <Icon
                          size={18}
                          className={`shrink-0 transition-colors ${
                            active
                              ? isAdminGroup
                                ? 'text-amber-600'
                                : 'text-zinc-900'
                              : 'text-zinc-400 group-hover/item:text-zinc-600'
                          }`}
                        />
                        <span className="truncate">{getLabel(item)}</span>
                        {active && (
                          <div
                            className={`ml-auto w-1.5 h-1.5 rounded-full ${
                              isAdminGroup ? 'bg-amber-500' : 'bg-zinc-900'
                            }`}
                          />
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

      {/* 底部用户区域 */}
      <div className="border-t border-zinc-100 p-4 space-y-3">
        <LanguageSwitcher />

        <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50">
          <div className="w-9 h-9 bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-lg flex items-center justify-center text-zinc-500 shrink-0">
            <span className="text-sm font-bold">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-800 truncate">
              {user?.name || '用户'}
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-zinc-200 transition-colors text-zinc-400 hover:text-red-500 shrink-0"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const { user, isSudo, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { locale } = useI18n();

  const allItems = isSudo ? [...menuItems, ...adminItems] : menuItems;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return (pathname ?? '').startsWith(href.split('?')[0]);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed top-4 left-4 z-[997] bg-white border border-zinc-200 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-shadow"
        >
          <Menu size={20} className="text-zinc-600" />
        </button>
      )}

      {/* PC 端侧边栏 */}
      <div className="hidden md:flex w-[260px] h-screen fixed left-0 top-0 border-r border-zinc-100 z-[100] bg-white flex-col">
        <SidebarContent
          items={allItems}
          isActive={isActive}
          onItemClick={() => setIsOpen(false)}
          user={user}
          onLogout={handleLogout}
          locale={locale}
        />
      </div>

      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[998]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <div
        className="md:hidden fixed top-0 h-screen w-[280px] z-[999] bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{ left: 0, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <SidebarContent
          items={allItems}
          isActive={isActive}
          onItemClick={() => setIsOpen(false)}
          user={user}
          onLogout={handleLogout}
          showCloseButton
          onClose={() => setIsOpen(false)}
          locale={locale}
        />
      </div>
    </>
  );
}

export { Sidebar };
export default Sidebar;
