'use client';

import { useEffect } from 'react';

export function HeadInjector({ content }: { content: string }) {
  useEffect(() => {
    if (!content) return;
    document.head.insertAdjacentHTML('beforeend', content);
  }, [content]);

  return null;
}
