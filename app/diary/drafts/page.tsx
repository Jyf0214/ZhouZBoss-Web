'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
    router.push(`/diary/new?draft=${encodeURIComponent(d.id)}`);
  };

  if (authLoading) return <GlobalLoading />;
  if (!user || !isSudo) return null;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Button onClick={() => router.push('/diary')} variant="ghost" size="sm" icon={<ArrowLeft size={16}/>}>返回</Button>
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
              <Button onClick={() => router.push('/diary/new')} variant="primary" size="md" icon={<FileText size={16}/>}>写新日记</Button>
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
                      {(d.tags ?? []).length > 0 && (
                        <span className="text-zinc-300">{(d.tags ?? []).join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button onClick={() => handleContinue(d)} variant="secondary" size="sm">继续</Button>
                    <Button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      variant="dangerGhost"
                      size="sm"
                      iconOnly
                      icon={<Trash2 size={14} />}
                      loading={deleting === d.id}
                      title="删除草稿"
                      aria-label="删除草稿"
                    />
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
