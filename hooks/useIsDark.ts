/**
 * Hook to check if the current theme is dark
 * 
 * Uses CSS media query to detect dark mode preference
 * This is a simplified version that doesn't require next-themes
 * 
 * @see https://github.com/lobehub/lobe-chat - branch: canary, commit: 81bd6dc
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 * 
 * @returns boolean - true if current theme is dark, false otherwise
 */
'use client';

import { useEffect, useState } from 'react';

export const useIsDark = (): boolean => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
};
