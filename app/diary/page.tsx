'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Lock, Calendar, Tag } from 'lucide-react';

interface DiaryItem {
  slug: string;
  title: string;
  date?: string;
  tags: string[];
  description?: string;
}

interface GroupItem {
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  groupName?: string;
}

export default function DiaryPage() {
  const [data, setData] = React.useState<{diaries: DiaryItem[], groups: GroupItem[]}>({diaries: [], groups: []});
  const [loading, setLoading] = React.useState(true);
  const { user, isSudo } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!user || !isSudo) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/diary');
        if (res.ok) {
          const json = await res.json();
          setData({
            diaries: Array.isArray(json.diaries) ? json.diaries : [],
            groups: Array.isArray(json.indexes) ? json.indexes : []
          });
        } else {
          console.error('API response not ok:', res.status);
        }
      } catch (err) {
        console.error('Failed to fetch diaries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, isSudo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center">
            <Lock size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-2">
              私密日记
            </h1>
            <p className="text-zinc-400 text-lg">仅管理员可查看</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.diaries.length > 0 ? (
            data.diaries.map((diary) => (
              <div
                key={diary.slug}
                className="bg-white rounded-2xl border border-zinc-100 p-6 hover:border-zinc-300 transition-all"
              >
                <h3 className="text-xl font-bold text-zinc-900 mb-2">{diary.title}</h3>
                {diary.description && (
                  <p className="text-zinc-400 text-sm mb-4">{diary.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  {diary.date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>{new Date(diary.date).toLocaleDateString('zh-CN')}</span>
                    </div>
                  )}
                  {diary.tags.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Tag size={14} />
                      <span>{diary.tags.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-white rounded-2xl border border-zinc-100">
              <p className="text-zinc-400">暂无日记</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
