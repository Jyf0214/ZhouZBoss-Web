'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import DiaryForm from '../../_form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDiaryPage({ params }: PageProps) {
  const [id, setId] = React.useState<string | null>(null);
  const [initialTitle, setInitialTitle] = React.useState('');
  const [initialContent, setInitialContent] = React.useState('');
  const [initialTags, setInitialTags] = React.useState<string[]>([]);
  const [pageLoading, setPageLoading] = React.useState(true);
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    async function init() {
      const { id: resolvedId } = await params;
      setId(resolvedId);
      try {
        const res = await fetch(`/api/diary/${resolvedId}`);
        if (!res.ok) throw new Error('加载失败');
        const json = await res.json();
        if (json.diary) {
          setInitialTitle(json.diary.title ?? '');
          setInitialContent(json.diary.content ?? '');
          setInitialTags(json.diary.tags ?? []);
        }
      } catch {
        showError('加载日记失败');
        router.push('/diary');
      } finally {
        setPageLoading(false);
      }
    }
    void init();
  }, [params, router]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isSudo) {
      router.push('/login');
    }
  }, [user, isSudo, authLoading, router]);

  if (authLoading || pageLoading) return <GlobalLoading />;
  if (!user || !isSudo) return null;
  if (!id) return null;

  return (
    <DiaryForm
      mode="edit"
      draftId={id}
      initialTitle={initialTitle}
      initialContent={initialContent}
      initialTags={initialTags}
      onSave={async (title, content, tags) => {
        const res = await fetch(`/api/diary/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags }),
        });
        if (!res.ok) throw new Error('保存失败');
        return id;
      }}
    />
  );
}
