'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useRouter } from 'next/navigation';
import {
  FileText, Users, Clock, CheckCircle, Plus, Settings, BookOpen,
  ArrowRight, Shield, UserCog, Trash2, Activity, Palette
} from 'lucide-react';
import { Button, Flexbox, Text, Icon } from '@lobehub/ui';
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
  updatedAt: string;
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
        // 获取文章统计
        const articlesRes = await fetch('/api/articles');
        if (articlesRes.ok) {
          const articles = await articlesRes.json();
          const published = articles.filter((a: any) => a.status === 'published').length;
          const drafts = articles.filter((a: any) => a.status === 'draft').length;
          const pending = articles.filter((a: any) => a.status === 'pending_deletion').length;
          
          setStats(prev => ({
            ...prev,
            totalArticles: articles.length,
            publishedArticles: published,
            draftArticles: drafts,
            pendingDeletion: pending,
          }));
          
          // 最近文章
          setRecentArticles(articles.slice(0, 5).map((a: any) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            updatedAt: a.updatedAt,
          })));
        }

        // 获取用户统计（仅管理员）
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
    {
      title: t('dashboard.allArticles'),
      value: stats.totalArticles,
      icon: FileText,
      color: 'var(--ant-color-primary)',
      bgColor: 'var(--ant-color-primary-bg)',
    },
    {
      title: t('dashboard.published'),
      value: stats.publishedArticles,
      icon: CheckCircle,
      color: 'var(--ant-color-success)',
      bgColor: 'var(--ant-color-success-bg)',
    },
    {
      title: t('dashboard.drafts'),
      value: stats.draftArticles,
      icon: Clock,
      color: 'var(--ant-color-warning)',
      bgColor: 'var(--ant-color-warning-bg)',
    },
    ...(isSudo ? [
      {
        title: t('dashboard.totalUsers'),
        value: stats.totalUsers,
        icon: Users,
        color: 'var(--ant-color-info)',
        bgColor: 'var(--ant-color-info-bg)',
      },
      {
        title: t('dashboard.pendingDeletion'),
        value: stats.pendingDeletion,
        icon: Trash2,
        color: 'var(--ant-color-error)',
        bgColor: 'var(--ant-color-error-bg)',
      },
    ] : []),
  ];

  // 用户快捷操作
  const userActions = [
    { label: t('sidebar.writeArticle'), icon: Plus, href: '/editor', color: 'var(--ant-color-primary)' },
    { label: t('sidebar.articleManagement'), icon: BookOpen, href: '/dashboard/articles', color: 'var(--ant-color-success)' },
    { label: t('sidebar.recycleBin'), icon: Trash2, href: '/dashboard/articles?status=pending_deletion', color: 'var(--ant-color-warning)' },
  ];

  // 管理员额外操作
  const adminActions = [
    { label: t('sidebar.userManagement'), icon: UserCog, href: '/admin/users', color: 'var(--ant-color-info)' },
    { label: t('sidebar.userGroups'), icon: Shield, href: '/admin/groups', color: 'var(--ant-color-purple)' },
    { label: t('sidebar.systemConfig'), icon: Settings, href: '/admin/config', color: 'var(--ant-color-warning)' },
    { label: t('sidebar.envVariables'), icon: Activity, href: '/admin/env', color: 'var(--ant-color-success)' },
    { label: t('sidebar.recycleBin'), icon: Trash2, href: '/admin/requests', color: 'var(--ant-color-error)' },
  ];

  const quickActions = isSudo ? [...userActions, ...adminActions] : userActions;

  if (loading) {
    return (
      <Flexbox align="center" justify="center" style={{ height: '100%', minHeight: 400 }}>
        <Text type="secondary">{t('common.loading')}</Text>
      </Flexbox>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* 欢迎区域 */}
      <Flexbox gap={8} style={{ marginBottom: 32 }}>
        <Flexbox horizontal gap={12} align="center">
          <Text fontSize={28} weight={'bold'}>
            {t('dashboard.welcomeBack')}，{user?.name || '用户'}
          </Text>
          {isSudo && (
            <span style={{
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 12,
              background: 'var(--ant-color-primary-bg)',
              color: 'var(--ant-color-primary)',
            }}>
              {userRole === 'sudo' ? t('dashboard.superAdmin') : t('dashboard.admin')}
            </span>
          )}
        </Flexbox>
        <Text fontSize={16} type={'secondary'}>
          {isSudo ? t('dashboard.adminConsole') : t('dashboard.contentConsole')}
        </Text>
      </Flexbox>

      {/* 统计卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {statCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #e5e5e5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Flexbox gap={16} align="flex-start">
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon icon={card.icon} style={{ color: card.color, fontSize: 24 }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 14 }}>{card.title}</Text>
                <Text fontSize={32} weight={'bold'}>{card.value}</Text>
              </div>
            </Flexbox>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div style={{ marginBottom: 32 }}>
        <Text fontSize={18} weight={'bold'} style={{ marginBottom: 16, display: 'block' }}>
          {t('dashboard.quickActions')}
        </Text>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12
        }}>
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--ant-color-bg-container)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid var(--ant-color-border-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ant-color-border-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Flexbox horizontal justify="space-between" align="center">
                  <Flexbox horizontal gap={12} align="center">
                    <Icon icon={action.icon} style={{ color: action.color }} />
                    <Text>{action.label}</Text>
                  </Flexbox>
                  <Icon icon={ArrowRight} style={{ color: 'var(--ant-color-text-tertiary)' }} />
                </Flexbox>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 最近文章 */}
      <div>
        <Flexbox horizontal justify="space-between" align="center" style={{ marginBottom: 16 }}>
          <Text fontSize={18} weight={'bold'}>{t('dashboard.recentArticles')}</Text>
          <Link href="/dashboard/articles">
            <Button size="small" icon={<Icon icon={ArrowRight} />}>
              {t('dashboard.viewAll')}
            </Button>
          </Link>
        </Flexbox>
        
        <div style={{
          background: 'var(--ant-color-bg-container)',
          borderRadius: 12,
          border: '1px solid var(--ant-color-border-secondary)',
          overflow: 'hidden'
        }}>
          {recentArticles.length > 0 ? (
            recentArticles.map((article, index) => (
              <div
                key={article.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < recentArticles.length - 1 ? '1px solid var(--ant-color-border-secondary)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => router.push(`/editor?id=${article.id}`)}
              >
                <Flexbox horizontal justify="space-between" align="center">
                  <div>
                    <Text weight={500}>{article.title}</Text>
                    <Text fontSize={12} type="secondary" style={{ display: 'block', marginTop: 4 }}>
                      {new Date(article.updatedAt).toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US')}
                    </Text>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    background: article.status === 'published' 
                      ? 'var(--ant-color-success-bg)' 
                      : article.status === 'pending_deletion'
                        ? 'var(--ant-color-error-bg)'
                        : 'var(--ant-color-warning-bg)',
                    color: article.status === 'published'
                      ? 'var(--ant-color-success)'
                      : article.status === 'pending_deletion'
                        ? 'var(--ant-color-error)'
                        : 'var(--ant-color-warning)',
                  }}>
                      {article.status === 'published' ? t('article.published') : article.status === 'pending_deletion' ? t('article.pendingDeletion') : t('article.draft')}
                  </span>
                </Flexbox>
              </div>
            ))
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Text type="secondary">{t('dashboard.noArticles')}</Text>
              <div style={{ marginTop: 16 }}>
                <Link href="/editor">
                  <Button type="primary" icon={<Icon icon={Plus} />}>
                    {t('dashboard.writeFirstArticle')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
