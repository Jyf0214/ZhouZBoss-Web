'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Home, LayoutDashboard, FileText, Settings, ShieldAlert, Globe, User } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { userRole } = useAuth();
  const { t } = useI18n();

  const links = [
    { href: '/', label: t('sidebar.home'), icon: Home, roles: ['admin', 'sudo', 'user'] },
    { href: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, roles: ['admin', 'sudo', 'user'] },
    { href: '/dashboard/settings', label: t('sidebar.settings'), icon: User, roles: ['admin', 'sudo', 'user'] },
    { href: '/dashboard/articles', label: t('sidebar.articleManagement'), icon: FileText, roles: ['admin', 'sudo', 'user'] },
    { href: '/tickets', label: t('sidebar.tickets'), icon: FileText, roles: ['admin', 'sudo', 'user'] },
    { href: '/admin/requests', label: t('sidebar.requests'), icon: ShieldAlert, roles: ['admin', 'sudo'] },
    { href: '/admin/config', label: t('sidebar.systemConfig'), icon: Settings, roles: ['admin', 'sudo'] },
    { href: '/admin/env', label: t('sidebar.envVariables'), icon: Globe, roles: ['admin', 'sudo'] },
  ];

  if (!userRole) return null;

  const filteredLinks = links.filter(link => userRole && link.roles.includes(userRole));
  if (filteredLinks.length === 0) return null;

  return (
    <aside className="w-72 border-r border-zinc-200/60 bg-gradient-to-b from-zinc-50/80 to-transparent hidden md:block min-h-[calc(100vh-4rem)] backdrop-blur-sm">
      <div className="p-6">
        <div className="py-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
            {t('sidebar.originiumKernel')}
          </span>
        </div>
        <nav className="space-y-1 mt-4">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (pathname ?? '').startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-md shadow-zinc-900/10'
                    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                }`}
              >
                <Icon size={18} className={`transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
