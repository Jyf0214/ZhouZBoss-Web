'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'dashboard.title',
  '/dashboard/articles': 'sidebar.articleManagement',
  '/dashboard/settings': 'settings.title',
  '/dashboard/admin': 'dashboard.adminConsole',
  '/dashboard/admin/config': 'sidebar.systemConfig',
  '/dashboard/admin/config/preview': 'sidebar.configPreview',
  '/dashboard/admin/env': 'sidebar.envVariables',
  '/dashboard/admin/tickets': 'sidebar.tickets',
  '/dashboard/admin/users': 'sidebar.userManagement',
  '/posts': 'sidebar.posts',
  '/faces': 'sidebar.faces',
  '/editor': 'sidebar.writeArticle',
  '/diary': 'sidebar.diary',
};

export function TopHeader() {
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

  const isAdminPage = pathname?.startsWith('/admin');
  const breadcrumb = pathname ? getBreadcrumbLabel(pathname) : '';

  return (
    <header className="h-16 bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700 flex items-center px-4 md:px-6 sticky top-0 z-50">
      <nav className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 min-w-0 overflow-hidden">
        <span className="hover:text-zinc-600 transition-colors shrink-0">{t('dashboard.title') || '控制台'}</span>
        {breadcrumb && (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className={`font-medium truncate ${isAdminPage ? 'text-amber-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {breadcrumb}
            </span>
          </>
        )}
      </nav>
    </header>
  );
}

export default TopHeader;
