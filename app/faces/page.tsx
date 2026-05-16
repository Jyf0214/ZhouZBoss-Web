'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { FacesListClient, type FaceItem, type GroupItem } from './FacesListClient';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';

export default function FacesPage() {
  const [data, setData] = React.useState<{faces: FaceItem[], groups: GroupItem[]}>({faces: [], groups: []});
  const [loading, setLoading] = React.useState(true);
  const { t } = useI18n();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/faces');
        if (res.ok) {
          const json = await res.json();
        setData({
          faces: Array.isArray(json.faces) ? json.faces : [],
          groups: Array.isArray(json.indexes) ? json.indexes : []
        });
      } else {
        console.error('API response not ok:', res.status);
        showError('通讯录加载失败');
      }
    } catch (err) {
      console.error('Failed to fetch faces:', err);
      showError('通讯录加载失败');
    } finally {
      setLoading(false);
    }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <GlobalLoading size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10">
        <div className="flex flex-col gap-3 mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            {t('nav.faces')}
          </h1>
          <p className="text-sm text-zinc-400">{t('home.facesDesc', { count: data.faces?.length || 0 })}</p>
        </div>
        <FacesListClient faces={data.faces || []} groups={data.groups || []} />
      </main>
    </div>
  );
}
