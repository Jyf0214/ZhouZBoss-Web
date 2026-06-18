'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { ArrowLeftFromLine, ArrowRightToLine } from 'lucide-react';
import SidebarHeader from './SidebarHeader';
import SidebarUserMenu from './SidebarUserMenu';
import SidebarGroup from './SidebarGroup';
import MobileToggle from './MobileToggle';
import { useSidebarState } from './use-sidebar-state';
import { userMenuItems, adminMenuItems } from './sidebar-config';
import type { SidebarVariant, MenuItem } from './types';

function Sidebar({ variant = 'user' }: { variant?: SidebarVariant }) {
  const { user, isSudo, logout } = useAuth();
  const pathname = usePathname();
  const { t } = useI18n();
  const { isOpen, open, close } = useSidebarState();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [internalVariant, setInternalVariant] = useState<SidebarVariant | null>(null);

  const effectiveVariant: SidebarVariant = internalVariant ?? variant;

  const visibleUserItems: MenuItem[] = userMenuItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (item.roles.includes('sudo')) return isSudo;
    return false;
  });

  const items: MenuItem[] = effectiveVariant === 'admin' ? adminMenuItems : visibleUserItems;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const isActive = (href: string) => {
    const [path = ''] = href.split('?');
    if (path === '/dashboard') return pathname === '/dashboard';
    return (pathname ?? '').startsWith(path);
  };

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const g = item.group ?? 'other';
    acc[g] ??= [];
    acc[g].push(item);
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const renderContent = (showCloseButton: boolean) => (
    <div className="flex flex-col h-full bg-white border-r border-zinc-100">
      <SidebarHeader showCloseButton={showCloseButton} onClose={close} />
      <SidebarUserMenu user={user ?? undefined} onLogout={handleLogout} />
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-7 custom-scrollbar">
        {Object.entries(grouped).map(([group, groupItems]) => (
          <SidebarGroup
            key={group}
            group={group}
            items={groupItems}
            isCollapsed={!!collapsedGroups[group]}
            onToggle={() => toggleGroup(group)}
            isActive={isActive}
            onItemClick={close}
            t={t}
          />
        ))}

        {/* 视图切换按钮：在管理后台菜单中快速切换到用户面板菜单 */}
        {effectiveVariant === 'admin' ? (
          <button
            type="button"
            onClick={() => setInternalVariant('user')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-all duration-300 w-full no-underline font-medium"
          >
            <ArrowRightToLine size={18} className="shrink-0 text-zinc-300" />
            <span>{t('sidebar.switchToUserMenu')}</span>
          </button>
        ) : variant === 'admin' ? (
          <button
            type="button"
            onClick={() => setInternalVariant(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all duration-300 w-full no-underline font-medium"
          >
            <ArrowLeftFromLine size={18} className="shrink-0 text-amber-400" />
            <span>{t('sidebar.switchToAdminMenu')}</span>
          </button>
        ) : null}
      </nav>
    </div>
  );

  return (
    <>
      <MobileToggle isOpen={isOpen} onClick={isOpen ? close : open} />
      <div className="hidden md:flex w-[280px] min-h-screen z-[100] bg-white flex-col">
        {renderContent(false)}
      </div>
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-zinc-900/40 backdrop-blur-md z-[998] transition-opacity duration-300"
          aria-hidden="true"
          onClick={close}
        />
      )}
      <div
        id="primary-sidebar"
        className="md:hidden fixed top-0 h-screen w-[300px] z-[999] bg-white shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
        style={{ left: 0, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {renderContent(true)}
      </div>
    </>
  );
}

export { Sidebar };
export default Sidebar;
