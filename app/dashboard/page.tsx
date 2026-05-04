'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useRouter } from 'next/navigation';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FileText, Users, Clock, CheckCircle, Plus, Settings,
  BookOpen, ArrowRight, Trash2, Activity,
  Globe, PenLine, Sparkles,
} from 'lucide-react';
import { Button, Spin, Tag } from 'antd';
import Link from 'next/link';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalUsers: number;
  pendingDeletion: number;
}

interface RecentArticle {
  id: string;
  title: string;
  status: string;
  slug?: string;
  updatedAt: string;
}

interface Article {
  id?: string;
  title: string;
  status: string;
  slug?: string;
  updatedAt?: string;
  date?: string;
}

export default function DashboardPage() {
  const { user, userRole, isSudo } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalUsers: 0,
    pendingDeletion: 0,
  });
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const articlesRes = await fetch('/api/articles');
        if (articlesRes.ok) {
          const articles = await articlesRes.json();
          const articlesArray = Array.isArray(articles) ? articles : [];
          const published = articlesArray.filter((a: Article) => a.status === 'published').length;
          const drafts = articlesArray.filter((a: Article) => a.status === 'draft').length;
          const pending = articlesArray.filter((a: Article) => a.status === 'pending_deletion').length;
          setStats(prev => ({
            ...prev,
            totalArticles: articlesArray.length,
            publishedArticles: published,
            draftArticles: drafts,
            pendingDeletion: pending,
          }));
          setRecentArticles(articlesArray.slice(0, 5).map((a: Article) => ({
            id: a.id || '',
            title: a.title,
            status: a.status,
            slug: a.slug,
            updatedAt: a.updatedAt || a.date || '',
          })));
        }
        if (isSudo) {
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const users = await usersRes.json();
            setStats(prev => ({ ...prev, totalUsers: users.length }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isSudo]);

  const statCards = [
    { title: t('dashboard.allArticles'), value: stats.totalArticles, icon: FileText, color: 'bg-zinc-900', textColor: 'text-white' },
    { title: t('dashboard.published'), value: stats.publishedArticles, icon: Globe, color: 'bg-emerald-500', textColor: 'text-white' },
    { title: t('dashboard.drafts'), value: stats.draftArticles, icon: Clock, color: 'bg-amber-500', textColor: 'text-white' },
    ...(isSudo ? [
      { title: t('dashboard.totalUsers'), value: stats.totalUsers, icon: Users, color: 'bg-blue-500', textColor: 'text-white' },
      { title: t('dashboard.pendingDeletion'), value: stats.pendingDeletion, icon: Trash2, color: 'bg-red-500', textColor: 'text-white' },
    ] : []),
  ];

  const userActions = [
    { label: t('sidebar.writeArticle'), icon: PenLine, href: '/editor', desc: t('dashboard.writeArticleDesc') },
    { label: t('sidebar.articleManagement'), icon: BookOpen, href: '/dashboard/articles', desc: t('dashboard.articleManagementDesc') },
    { label: t('sidebar.recycleBin'), icon: Trash2, href: '/dashboard/articles?status=pending_deletion', desc: t('dashboard.recycleBinDesc') },
  ];

  const adminActions = [
    { label: t('sidebar.systemConfig'), icon: Settings, href: '/admin/config', desc: t('dashboard.systemConfigDesc') },
    { label: t('sidebar.envVariables'), icon: Activity, href: '/admin/env', desc: t('dashboard.envVariablesDesc') },
  ];

  const quickActions = isSudo ? [...userActions, ...adminActions] : userActions;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* 欢迎区域 */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">
            {t('dashboard.welcomeBack')}，{user?.name || '用户'}
          </h1>
          {isSudo && (
            <Tag color="gold" className="rounded-lg text-xs font-bold">
              {userRole === 'sudo' ? t('dashboard.superAdmin') : t('dashboard.admin')}
            </Tag>
          )}
        </div>
        <p className="text-zinc-400 text-base">
          {isSudo ? t('dashboard.adminConsole') : t('dashboard.contentConsole')}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl border border-zinc-100 p-5 hover:shadow-lg hover:shadow-zinc-100 transition-all duration-300 group"
            >
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={18} className={card.textColor} />
              </div>
              <div className="text-3xl font-black text-zinc-900 mb-1">{card.value}</div>
              <div className="text-xs text-zinc-400 font-medium">{card.title}</div>
            </div>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href} className="group">
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 hover:border-zinc-300 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-zinc-50 rounded-xl flex items-center justify-center group-hover:bg-zinc-900 transition-colors duration-300">
                        <Icon size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{action.label}</div>
                        <div className="text-xs text-zinc-400">{action.desc}</div>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 最近文章 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-900">{t('dashboard.recentArticles')}</h2>
          <Link href="/dashboard/articles">
            <Button size="small" icon={<ArrowRight size={14} />} className="rounded-xl">
              {t('dashboard.viewAll')}
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {recentArticles.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (article.status === 'published' && article.slug) {
                      router.push(`/posts${article.slug}`);
                    } else {
                      router.push(`/editor?id=${article.id}`);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 truncate group-hover:text-zinc-600 transition-colors">
                      {article.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {article.updatedAt
                        ? new Date(article.updatedAt).toLocaleDateString(
                            locale === 'zh-CN' ? 'zh-CN' : 'en-US'
                          )
                        : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Tag
                      color={
                        article.status === 'published'
                          ? 'success'
                          : article.status === 'pending_deletion'
                          ? 'error'
                          : 'warning'
                      }
                      className="rounded-lg text-xs"
                    >
                      {article.status === 'published'
                        ? t('article.published')
                        : article.status === 'pending_deletion'
                        ? t('article.pendingDeletion')
                        : t('article.draft')}
                    </Tag>
                    <ArrowRight size={14} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <Sparkles size={28} />
              </div>
              <p className="text-zinc-400 mb-4">{t('dashboard.noArticles')}</p>
              <Link href="/editor">
                <Button type="primary" icon={<Plus size={14} />} className="bg-zinc-900 rounded-xl h-10">
                  {t('dashboard.writeFirstArticle')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
