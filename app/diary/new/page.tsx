'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GlobalLoading } from '@/components/Loading';
import DiaryForm from '../_form';

export default function NewDiaryPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const router = useRouter();

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
      draftId="new"
      onSave={async (title, content, tags) => {
        const res = await fetch('/api/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags }),
        });
        if (!res.ok) throw new Error('保存失败');
        return 'ok';
      }}
    />
  );
}
