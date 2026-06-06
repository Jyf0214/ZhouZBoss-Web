'use client';

import { motion } from 'motion/react';
import { Search, Filter } from 'lucide-react';
import { Input } from 'antd';
import { Button } from '@/components/ui/Button';
import { HeroBanner } from '@/app/HeroBanner';

export function HeroSection({
  heroTitleLine1,
  heroTitleLine2,
  searchTerm,
  onSearchChange,
  t,
}: {
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <section className="mb-16">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse"></div>
        <span>{t('home.siteStatus')}</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-8"
      >
        <div>{heroTitleLine1 ?? t('home.heroTitleLine1')}</div>
        <div className="text-zinc-300 -mt-4 md:-mt-6">{heroTitleLine2 ?? t('home.heroTitleLine2')}</div>
      </motion.h1>

      <div className="mb-8">
        <HeroBanner />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex gap-3 items-center max-w-2xl">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={20} />
            <Input
              placeholder={t('home.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-14 text-base w-full rounded-2xl bg-white border-zinc-200 hover:border-zinc-300 transition-colors"
              size="large"
              variant="outlined"
            />
          </div>
          <Button size="lg" variant="default" rounded="lg" icon={<Filter size={20} />} className="hover:bg-zinc-50">
            {t('common.sort')}
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
