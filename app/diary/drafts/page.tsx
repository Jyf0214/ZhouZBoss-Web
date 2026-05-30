'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2, FileText, Calendar } from 'lucide-react';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

interface DraftItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  savedAt: string;
}

export default function DiaryDraftsPage() {
  const [drafts, setDrafts] = React.useState<DraftItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

  const fetchDrafts = React.useCallback(async () => {
    try {
      const res = await fetch('/api/diary/draft');
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
    } catch {
      showError('加载草稿列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isSudo) {
      router.push('/login');
      return;
    }
    void fetchDrafts();
  }, [user, isSudo, authLoading, router, fetchDrafts]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {
      showError('删除草稿失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleContinue = (d: DraftItem) => {
    localStorage.setItem(
      `diary:draft:${d.id}`,
      JSON.stringify({ title: d.title, content: d.content, tags: d.tags, savedAt: d.savedAt }),
    );
    router.push(`/diary/new`);
  };

  if (authLoading) return <GlobalLoading />;
  if (!user || !isSudo) return null;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/diary')}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={16} className="sm:size-[18]" />
            <span className="hidden sm:inline">返回日记列表</span>
            <span className="sm:hidden">返回</span>
          </button>
          <h1 className="text-base sm:text-lg font-bold text-zinc-900">草稿箱</h1>
          <div className="w-16 sm:w-20" />
        </div>
      </div>

      <PageContainer maxWidth="4xl" padding="compact">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="text-zinc-300 animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState
            description="暂无草稿"
            action={
              <button
                onClick={() => router.push('/diary/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base"
              >
                <FileText size={16} />
                写新日记
              </button>
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {drafts.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-zinc-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
                      {d.title || '无标题'}
                    </h3>
                    {d.content && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{d.content}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(d.savedAt).toLocaleString('zh-CN')}
                      </span>
                      {d.tags.length > 0 && (
                        <span className="text-zinc-300">{d.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleContinue(d)}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors font-medium"
                    >
                      继续
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      title="删除草稿"
                    >
                      {deleting === d.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
