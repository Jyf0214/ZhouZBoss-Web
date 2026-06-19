'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import DiaryForm from '../_form';

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function NewDiaryPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingDraftId = searchParams?.get('draft');
  const [draftId] = React.useState(existingDraftId ?? genId);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) return <GlobalLoading />;
  if (!user) return null;
  if (!isSudo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-lg">无权访问</p>
      </div>
    );
  }

  return (
    <DiaryForm
      mode="new"
      draftId={draftId}
      initialDate={new Date().toISOString().slice(0, 10)}
      onSave={async (title, content, tags, date, group) => {
        const res = await fetch('/api/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags, date, group }),
        });
        if (!res.ok) throw new Error('保存失败');
        return 'ok';
      }}
    />
  );
}
