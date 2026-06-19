'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';

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
  '/page': 'sidebar.customPages',
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
    <header className="h-16 bg-white border-b border-zinc-100 flex items-center px-4 md:px-6 sticky top-0 z-50" aria-label="页面顶部栏">
      <nav aria-label="面包屑导航" className="flex items-center gap-1.5 text-sm text-zinc-400">
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
    </header>
  );
}

export default TopHeader;
