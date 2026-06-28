'use client';

import { useEffect, useState } from 'react';

import { showError } from '@/lib/error';

import type { Article, RecentArticle, Stats } from './types';

export interface DashboardData {
  stats: Stats;
  recentArticles: RecentArticle[];
  loading: boolean;
}

/** 统计指定状态的文章数量 */
function countByStatus(articles: Article[], status: Article['status']): number {
  return articles.filter((a) => a.status === status).length;
}

/** 把原始 Article 精简为最近文章列表项 */
function toRecentArticle(a: Article): RecentArticle {
  return {
    id: a.id ?? '',
    title: a.title,
    status: a.status,
    slug: a.slug,
    updatedAt: a.updatedAt ?? a.date ?? '',
  };
}

/** 加载仪表盘文章统计与最近文章列表 */
export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    pendingDeletion: 0,
  });
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      try {
        const articlesRes = await fetch('/api/articles');
        if (articlesRes.ok && !cancelled) {
          const data: unknown = await articlesRes.json();
          const articles = Array.isArray(data) ? (data as Article[]) : [];
          setStats({
            totalArticles: articles.length,
            publishedArticles: countByStatus(articles, 'published'),
            draftArticles: countByStatus(articles, 'draft'),
            pendingDeletion: countByStatus(articles, 'pending_deletion'),
          });
          setRecentArticles(articles.slice(0, 5).map(toRecentArticle));
        } else if (!cancelled) {
          showError('文章数据加载失败');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch stats:', error);
          showError('仪表盘数据加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchData();
    return () => { cancelled = true; };
  }, []);

  return { stats, recentArticles, loading };
}
