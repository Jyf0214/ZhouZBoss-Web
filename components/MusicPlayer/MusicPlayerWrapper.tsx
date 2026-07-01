'use client';

import dynamic from 'next/dynamic';

const MusicPlayer = dynamic(
  () => import('./index').then((m) => ({ default: m.MusicPlayer })),
  { ssr: false },
);

export function MusicPlayerWrapper() {
  return <MusicPlayer />;
}
