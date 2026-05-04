'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { FacesListClient, type FaceItem, type GroupItem } from './FacesListClient';
import { useI18n } from '@/hooks/use-i18n';

export default function FacesPage() {
  const [data, setData] = React.useState<{faces: FaceItem[], groups: GroupItem[]}>({faces: [], groups: []});
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
        }
      } catch (err) {
        console.error('Failed to fetch faces:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-4">
          {t('nav.faces')}
        </h1>
        <p className="text-zinc-400 text-lg mb-12">{t('home.facesDesc', { count: data.faces?.length || 0 })}</p>
        <FacesListClient faces={data.faces || []} groups={data.groups || []} />
      </main>
    </div>
  );
}
