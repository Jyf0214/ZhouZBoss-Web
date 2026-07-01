'use client';

import { AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/hooks/use-i18n';
import { CategoryBar } from '@/components/CategoryBar';
import { HeroSection } from './HeroSection';
import { PostCard } from './PostCard';
import { Pagination } from './Pagination';
import { useHomeFilter } from './use-home-filter';
import { DEFAULT_CATEGORIES } from './home-constants';
import type { HomePostGridProps } from './types';

export type { HomePostGridProps, PostItem, CoverConfig } from './types';

export function HomePostGrid({
  posts,
  heroTitleLine1,
  heroTitleLine2,
  defaultCover,
  coverConfig,
}: HomePostGridProps) {
  const { t, locale } = useI18n();
  const {
    selectedTag,
    setSelectedTag,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    filteredPosts,
    totalPages,
    paginatedPosts,
    allTags,
  } = useHomeFilter(posts);

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
      <HeroSection
        heroTitleLine1={heroTitleLine1}
        heroTitleLine2={heroTitleLine2}
        t={t}
      />

      <div className="mb-10 sticky top-[72px] z-30 md:relative md:top-0">
        <CategoryBar
          categories={DEFAULT_CATEGORIES}
          tags={allTags}
          selectedCategory={selectedCategory}
          selectedTag={selectedTag}
          onSelectCategory={setSelectedCategory}
          onSelectTag={setSelectedTag}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-zinc-900">{t('home.latestPosts')}</h2>
          {posts.length > 0 && (
            <Link href="/posts" className="text-sm text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors">
              {t('home.viewAll')} <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPosts.length > 0
              ? paginatedPosts.map((post) => (
                  <PostCard
                    key={post.slug}
                    post={post}
                    coverConfig={coverConfig}
                    defaultCover={defaultCover}
                    t={t}
                    locale={locale}
                  />
                ))
              : (
                  <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-zinc-100 shadow-sm">
                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                      <Sparkles size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-2">{t('home.emptyTitle')}</h3>
                    <p className="text-zinc-400 font-medium whitespace-pre-line">
                      {t('home.noPosts')}
                    </p>
                  </div>
                )}
          </AnimatePresence>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} t={t} />
      </section>
    </main>
  );
}

export default HomePostGrid;
