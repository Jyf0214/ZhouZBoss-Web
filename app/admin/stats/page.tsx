'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { GlobalLoading } from '@/components/Loading';
import ProCard from '@/components/ui/ProCard';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { BarChart3, BookOpen, Users, PenLine, Type, Clock } from 'lucide-react';

/* ---------- 类型 ---------- */

interface TagItem { name: string; count: number; }
interface CategoryItem { name: string; count: number; }
interface RecentPost { title: string; date: string; slug: string; wordCount: number; }

interface StatsData {
  counts: { posts: number; diary: number; faces: number; total: number };
  topTags: TagItem[];
  categories: CategoryItem[];
  wordCount: { total: number; avgPost: number };
  timeline: { last7Days: number; last30Days: number };
  recentPosts: RecentPost[];
}

/* ---------- 指标卡片 ---------- */

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <ProCard padding="p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold text-zinc-900">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
        </div>
      </div>
    </ProCard>
  );
}

/* ---------- 横向条形图 ---------- */

function BarChart({ items, maxCount }: { items: { name: string; count: number }[]; maxCount: number }) {
  if (items.length === 0) {
    return <div className="text-sm text-zinc-400 py-4">暂无数据</div>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-3">
          <div className="w-24 text-sm text-zinc-600 truncate shrink-0" title={item.name}>{item.name}</div>
          <div className="flex-1 h-6 bg-zinc-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-500"
              style={{ width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : '0%' }}
            />
          </div>
          <div className="w-10 text-right text-sm font-medium text-zinc-500 shrink-0">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 时间线 ---------- */

function Timeline({ posts }: { posts: RecentPost[] }) {
  if (posts.length === 0) {
    return <div className="text-sm text-zinc-400 py-4">暂无发布记录</div>;
  }
  return (
    <div className="space-y-0">
      {posts.map((post, i) => {
        const d = new Date(post.date);
        if (isNaN(d.getTime())) return null;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return (
          <div key={post.slug + i} className="flex gap-4 py-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 mt-1.5 shrink-0" />
              {i < posts.length - 1 && <div className="w-px flex-1 bg-zinc-100 my-1" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="text-sm font-medium text-zinc-900 truncate">{post.title}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                <span>{dateStr}</span>
                <span>{post.wordCount.toLocaleString()} 字</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 页面主体 ---------- */

export default function StatsPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `请求失败 (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && isSudo) {
      void fetchStats();
    }
  }, [authLoading, user, isSudo, fetchStats]);

  if (authLoading) return <GlobalLoading />;

  const tagMax = data ? Math.max(...data.topTags.map(t => t.count), 1) : 1;
  const catMax = data ? Math.max(...data.categories.map(c => c.count), 1) : 1;

  return (
    <PageContainer maxWidth="6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">内容统计</h1>
          <p className="text-zinc-400 text-sm mt-1">各模块内容数量、标签分布、字数统计</p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20"><GlobalLoading /></div>
      )}

      {error && (
        <ProCard padding="p-6">
          <div className="text-center">
            <div className="text-red-500 text-sm mb-3">{error}</div>
            <Button
              variant="primary"
              onClick={fetchStats}
            >
              重试
            </Button>
          </div>
        </ProCard>
      )}

      {data && (
        <>
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard icon={BookOpen} label="文章数" value={data.counts.posts} color="bg-blue-500" />
            <StatCard icon={PenLine} label="日记数" value={data.counts.diary} color="bg-emerald-500" />
            <StatCard icon={Users} label="Faces 数" value={data.counts.faces} color="bg-amber-500" />
            <StatCard icon={Type} label="总字数" value={data.wordCount.total} color="bg-purple-500" />
          </div>

          {/* 发布时间统计 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <ProCard padding="p-5">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-zinc-400" />
                <div>
                  <div className="text-lg font-bold text-zinc-900">{data.counts.total}</div>
                  <div className="text-xs text-zinc-400">全部内容</div>
                </div>
              </div>
            </ProCard>
            <ProCard padding="p-5">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-zinc-400" />
                <div>
                  <div className="text-lg font-bold text-zinc-900">{data.timeline.last7Days}</div>
                  <div className="text-xs text-zinc-400">最近 7 天发布</div>
                </div>
              </div>
            </ProCard>
            <ProCard padding="p-5">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-zinc-400" />
                <div>
                  <div className="text-lg font-bold text-zinc-900">{data.timeline.last30Days}</div>
                  <div className="text-xs text-zinc-400">最近 30 天发布</div>
                </div>
              </div>
            </ProCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 标签分布 */}
            <ProCard title="标签分布（Top 10）" padding="p-5">
              <BarChart items={data.topTags} maxCount={tagMax} />
            </ProCard>

            {/* 分类文章数量 */}
            <ProCard title="分类文章数量" padding="p-5">
              <BarChart items={data.categories} maxCount={catMax} />
            </ProCard>
          </div>

          {/* 最近发布时间线 */}
          <ProCard title="最近发布时间线" padding="p-5">
            <Timeline posts={data.recentPosts} />
          </ProCard>

          {/* 平均字数 */}
          <div className="mt-6 text-center text-sm text-zinc-400">
            文章平均字数：{data.wordCount.avgPost.toLocaleString()} 字
          </div>
        </>
      )}
    </PageContainer>
  );
}
