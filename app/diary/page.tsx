'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Plus, Edit3, Trash2, Calendar, Tag, Eye, X, Loader2, Search, FileText, Pin } from 'lucide-react';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { PageContainer } from '@/components/ui/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

interface DiaryEntry {
  id: string;
  title: string;
  content?: string;
  tags: string[];
  date: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function DiaryPage() {
  const [diaries, setDiaries] = React.useState<DiaryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewingId, setViewingId] = React.useState<string | null>(null);
  const [viewContent, setViewContent] = React.useState<string>('');
  const [viewLoading, setViewLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [pinning, setPinning] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams();
    if (searchText.trim()) params.set('search', searchText.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return `/api/diary${qs ? `?${qs}` : ''}`;
  }, [searchText, startDate, endDate]);

  const fetchDiaries = React.useCallback(async () => {
    try {
      const res = await fetch(buildQuery());
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setDiaries(Array.isArray(json.diaries) ? json.diaries : []);
    } catch {
      showError('日记列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isSudo) {
      router.push('/login');
      return;
    }
    void fetchDiaries();
  }, [user, isSudo, authLoading, router, fetchDiaries]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      if (viewingId === id) {
        setViewingId(null);
        setViewContent('');
      }
      await fetchDiaries();
    } catch {
      showError('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePin = async (id: string) => {
    setPinning(id);
    try {
      const res = await fetch(`/api/diary/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('切换置顶失败');
      await fetchDiaries();
    } catch {
      showError('切换置顶状态失败');
    } finally {
      setPinning(null);
    }
  };

  const handleView = async (d: DiaryEntry) => {
    if (viewingId === d.id) {
      setViewingId(null);
      setViewContent('');
      return;
    }
    setViewLoading(true);
    setViewingId(d.id);
    try {
      const res = await fetch(`/api/diary/${d.id}`);
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setViewContent(json.diary?.content ?? '');
    } catch {
      showError('加载日记内容失败');
      setViewingId(null);
    } finally {
      setViewLoading(false);
    }
  };

  if (authLoading) return <GlobalLoading />;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <PageContainer maxWidth="4xl" padding="compact">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-black tracking-tighter text-zinc-900 mb-1 sm:mb-2">
              日记
            </h1>
            <p className="text-sm sm:text-base text-zinc-400">仅管理员可查看 · 全部存储于数据库</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/diary/drafts')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors font-medium text-sm"
            >
              <FileText size={14} className="sm:size-4" />
              <span className="hidden sm:inline">草稿箱</span>
            </button>
            <button
              onClick={() => router.push('/diary/new')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base"
            >
              <Plus size={16} className="sm:size-[18]" />
              <span className="hidden sm:inline">新建日记</span>
              <span className="sm:hidden">新建</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-sm">
            <Search size={14} className="sm:size-4 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索日记..."
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm"
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 sm:px-3 py-2 sm:py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 text-xs sm:text-sm w-[130px] sm:w-auto"
            title="开始日期"
          />
          <span className="text-zinc-400 text-xs sm:text-sm">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 sm:px-3 py-2 sm:py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all text-zinc-900 text-xs sm:text-sm w-[130px] sm:w-auto"
            title="结束日期"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 sm:py-32">
            <Loader2 size={24} className="sm:size-8 text-zinc-300 animate-spin" />
          </div>
        ) : diaries.length === 0 ? (
          <EmptyState
            description="暂无日记"
            action={
              <button
                onClick={() => router.push('/diary/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base"
              >
                <Plus size={18} />
                写下第一篇日记
              </button>
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {diaries.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                <div
                  className="p-4 sm:p-6 cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => handleView(d)}
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-zinc-900 mb-1 sm:mb-2 flex items-center gap-2">
                        {d.pinned && <Pin size={16} className="text-amber-500 shrink-0 fill-amber-500" />}
                        {d.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-400">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Calendar size={12} className="sm:size-[14]" />
                          <span>{formatShortDate(d.date)}</span>
                        </div>
                        {d.tags.length > 0 && (
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Tag size={12} className="sm:size-[14]" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{d.tags.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleTogglePin(d.id)}
                        disabled={pinning === d.id}
                        className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                          d.pinned
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                        } disabled:opacity-50`}
                        title={d.pinned ? '取消置顶' : '置顶'}
                      >
                        {pinning === d.id
                          ? <Loader2 size={14} className="sm:size-4 animate-spin" />
                          : <Pin size={14} className={`sm:size-4 ${d.pinned ? 'fill-amber-500' : ''}`} />
                        }
                      </button>
                      <button
                        onClick={() => router.push(`/diary/${d.id}/edit`)}
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                        title="编辑"
                      >
                        <Edit3 size={14} className="sm:size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deleting === d.id}
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        title="删除"
                      >
                        {deleting === d.id ? <Loader2 size={14} className="sm:size-4 animate-spin" /> : <Trash2 size={14} className="sm:size-4" />}
                      </button>
                      <div className="p-1.5 sm:p-2 text-zinc-400" title={viewingId === d.id ? '收起' : '展开'}>
                        {viewingId === d.id ? <X size={14} className="sm:size-4" /> : <Eye size={14} className="sm:size-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {viewingId === d.id && (
                  <div className="border-t border-zinc-100 px-4 sm:px-6 py-4 sm:py-5">
                    {viewLoading ? (
                      <div className="flex items-center justify-center py-6 sm:py-8">
                        <Loader2 size={20} className="sm:size-6 text-zinc-300 animate-spin" />
                      </div>
                    ) : (
                      <div className="prose prose-zinc max-w-none prose-sm sm:prose-base">
                        <MarkdownRenderer content={viewContent} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
