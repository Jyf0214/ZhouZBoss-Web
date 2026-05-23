'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { Avatar } from '@/components/Avatar';
import LanguageSwitcher from '@/components/LanguageSwitcher/index';
import { LogOut } from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'dashboard.title',
  '/dashboard/articles': 'sidebar.articleManagement',
  '/dashboard/settings': 'settings.title',
  '/admin/config': 'sidebar.systemConfig',
  '/admin/config/preview': 'sidebar.configPreview',
  '/admin/env': 'sidebar.envVariables',
  '/admin/tickets': 'sidebar.tickets',
  '/admin/users': 'sidebar.userManagement',
  '/posts': 'sidebar.posts',
  '/faces': 'sidebar.faces',
  '/editor': 'sidebar.writeArticle',
  '/diary': 'sidebar.diary',
};

export function TopHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { t } = useI18n();

  const getBreadcrumbLabel = (path: string): string => {
    const key = breadcrumbMap[path];
    if (key) {
      const translated = t(key);
      const isUntranslated = ['dashboard.', 'sidebar.', 'settings.'].some(p => translated.startsWith(p));
      if (translated && !isUntranslated) return translated;
    }
    const segments = path.split('/').filter(Boolean);
    return segments.at(-1) ?? '';
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const isAdminPage = pathname?.startsWith('/admin');
  const breadcrumb = pathname ? getBreadcrumbLabel(pathname) : '';

  return (
    <header className="h-16 bg-white border-b border-zinc-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2 min-w-0">
        <nav className="flex items-center gap-1.5 text-sm text-zinc-400">
          <span className="hover:text-zinc-600 transition-colors">{t('dashboard.title') || '控制台'}</span>
          {breadcrumb && (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className={`font-medium ${isAdminPage ? 'text-amber-600' : 'text-zinc-700'}`}>
                {breadcrumb}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <LanguageSwitcher />

        <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-100">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-zinc-900 leading-tight">
              {user?.name ?? t('user.guest')}
            </div>
            <div className="text-[10px] font-medium text-zinc-400 leading-tight">
              {user?.role === 'sudo' ? t('user.sudo') : user?.role === 'admin' ? t('user.admin') : ''}
            </div>
          </div>
          <Avatar name={user?.name ?? 'U'} avatarUrl={user?.avatar} size={34} />
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-zinc-100 transition-all text-zinc-300 hover:text-red-500"
            title={t('auth.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
