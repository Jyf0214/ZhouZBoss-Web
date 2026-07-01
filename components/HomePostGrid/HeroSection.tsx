'use client';

import { motion } from 'motion/react';

export function HeroSection({
  heroTitleLine1,
  heroTitleLine2,
  t,
}: {
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <section className="mb-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-pulse"></div>
        <span>{t('home.siteStatus')}</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 dark:text-zinc-100 mb-4"
      >
        <div>{heroTitleLine1 ?? t('home.heroTitleLine1')}</div>
        <div className="text-zinc-300 -mt-4 md:-mt-6">{heroTitleLine2 ?? t('home.heroTitleLine2')}</div>
      </motion.h1>
    </section>
  );
}
