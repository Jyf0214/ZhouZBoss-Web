'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import Link from 'next/link';
import { GlobalLoading } from '@/components/Loading';
import ProCard from '@/components/ui/ProCard';
import { Settings, Eye, Activity, FileText, Users, Plus, ArrowRight, BarChart3 } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';

const adminSections = [
  { key: 'sidebar.systemConfig', icon: Settings, href: '/admin/config', color: 'bg-zinc-900', descKey: 'admin.desc.systemConfig' },
  { key: 'sidebar.configPreview', icon: Eye, href: '/admin/config/preview', color: 'bg-blue-500', descKey: 'admin.desc.configPreview' },
  { key: 'sidebar.envVariables', icon: Activity, href: '/admin/env', color: 'bg-emerald-500', descKey: 'admin.desc.envVariables' },
  { key: 'sidebar.tickets', icon: FileText, href: '/admin/tickets', color: 'bg-amber-500', descKey: 'admin.desc.tickets' },
  { key: 'sidebar.writeArticle', icon: Plus, href: '/admin/tickets/new', color: 'bg-purple-500', descKey: 'admin.desc.writeArticle' },
  { key: 'sidebar.userManagement', icon: Users, href: '/admin/users', color: 'bg-rose-500', descKey: 'admin.desc.userManagement' },
  { key: 'sidebar.contentStats', icon: BarChart3, href: '/admin/stats', color: 'bg-indigo-500', descKey: 'admin.desc.contentStats' },
];

export default function AdminPage() {
  const { loading: authLoading } = useAuth();
  const { t } = useI18n();

  if (authLoading) return <GlobalLoading />;

  return (
    <PageContainer maxWidth="6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t('dashboard.adminConsole') || '管理控制台'}
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          {t('dashboard.adminConsoleDesc') || '站点全局功能管理'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <ProCard hoverable padding="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {t(section.key)}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {t(section.descKey)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                </div>
              </ProCard>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
