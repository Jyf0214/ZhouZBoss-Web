'use client';

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter } from 'next/navigation';

/** 文章详情页 j/k 键盘导航 */
export function PostNavigationShortcuts({
  prevSlug,
  nextSlug,
}: {
  prevSlug?: string | null;
  nextSlug?: string | null;
}) {
  const router = useRouter();

  useKeyboardShortcuts({
    j: () => {
      if (nextSlug) router.push(`/posts${nextSlug}`);
    },
    k: () => {
      if (prevSlug) router.push(`/posts${prevSlug}`);
    },
  });

  return null;
}
