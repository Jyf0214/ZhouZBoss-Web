'use client';

import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export function PostListEmptyState({ t }: { t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-32 text-center"
    >
      <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Sparkles size={32} className="text-zinc-300" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 mb-2">{t('home.emptyTitle')}</h3>
      <p className="text-zinc-400 text-sm max-w-md mx-auto">{t('home.noPosts')}</p>
    </motion.div>
  );
}
