'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
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
  const [draftId] = React.useState(genId);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isSudo) {
      router.push('/login');
    }
  }, [user, isSudo, authLoading, router]);

  if (authLoading) return <GlobalLoading />;
  if (!user || !isSudo) return null;

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
