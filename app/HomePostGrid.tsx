'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, BookOpen, Users, ArrowRight, Calendar, User as UserIcon } from 'lucide-react';
import { Input, Button } from 'antd';
import Image from 'next/image';
import { useI18n } from '@/hooks/use-i18n';

interface PostItem {
  slug: string;
  title: string;
  date?: string;
  author?: string;
  tags: string[];
  cover?: string;
  description?: string;
}

interface HomePostGridProps {
  posts: PostItem[];
  postCount: number;
  facesCount: number;
  isAdmin?: boolean;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
}

/**
 * 首页帖子网格 — 客户端组件，负责搜索/筛选交互
 */
export function HomePostGrid({ posts, postCount, facesCount, isAdmin = false, heroTitleLine1, heroTitleLine2 }: HomePostGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { t, locale } = useI18n();

  // 获取所有标签
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || []))).sort();

  const filteredPosts = posts.filter((p) => {
    // 标签筛选
    if (selectedTag && !p.tags?.includes(selectedTag)) {
      return false;
    }
    // 搜索筛选
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
      {/* 英雄区域 */}
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
          className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-8 leading-[0.95]"
        >
          {heroTitleLine1 || t('home.heroTitleLine1')} <br />
          <span className="text-zinc-300">{heroTitleLine2 || t('home.heroTitleLine2')}</span>
        </motion.h1>

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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-base w-full rounded-2xl bg-white border-zinc-200 hover:border-zinc-300 transition-colors"
                size="large"
                variant="outlined"
              />
            </div>
            <Button size="large" icon={<Filter size={20} />} className="bg-white hover:bg-zinc-50 border-zinc-200 rounded-2xl">
              {t('common.sort')}
            </Button>
          </div>
        </motion.div>
      </section>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTag === null
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTag === tag
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 快捷入口 */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/posts" className="group">
            <div className="bg-white rounded-3xl border border-zinc-100 p-8 hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                  <BookOpen size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-1">{t('nav.posts')}</h2>
              <p className="text-zinc-400 text-sm">
                {t('home.postsDesc', { count: postCount })}
              </p>
            </div>
          </Link>
          {isAdmin && (
            <Link href="/faces" className="group">
              <div className="bg-white rounded-3xl border border-zinc-100 p-8 hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                    <Users size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-1">{t('nav.faces')}</h2>
                <p className="text-zinc-400 text-sm">
                  {t('home.facesDesc', { count: facesCount })}
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* 帖子列表 */}
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
              ? filteredPosts.slice(0, 8).map((post) => (
                  <motion.div
                    key={post.slug}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-white rounded-[2rem] border-2 border-zinc-50 overflow-hidden hover:border-zinc-900 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-zinc-100 flex flex-col"
                  >
                    <Link href={`/posts${post.slug}`} className="block overflow-hidden aspect-video bg-zinc-50 relative">
                      {post.cover ? (
                        <Image
                          src={post.cover}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-100 font-black text-6xl select-none">
                          {post.title.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/10 transition-colors duration-500" />
                      <div className="absolute top-6 right-6 w-12 h-12 bg-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 shadow-lg">
                        <ArrowRight size={24} className="text-zinc-900" />
                      </div>
                    </Link>
                    <div className="px-5 py-4 flex-1 flex flex-col">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-lg">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Link href={`/posts${post.slug}`} className="block group/title">
                        <h3 className="text-lg font-bold text-zinc-900 mb-2 line-clamp-2 leading-snug group-hover/title:text-zinc-600 transition-colors">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="text-zinc-400 text-sm line-clamp-2 mb-3 leading-relaxed">
                        {post.description || ''}
                      </p>
                      <div className="mt-auto pt-3 border-t border-zinc-50 flex items-center justify-between text-zinc-400">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-zinc-100 rounded flex items-center justify-center text-zinc-500">
                            <UserIcon size={10} />
                          </div>
                          <span className="text-xs font-medium text-zinc-500">
                            {post.author || t('home.anonymous')}
                          </span>
                        </div>
                        {post.date && (
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <Calendar size={12} />
                            <span>
                              {new Date(post.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
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
      </section>
    </main>
  );
}
