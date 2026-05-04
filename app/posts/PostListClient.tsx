'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Calendar, User, ArrowUpRight, Hash, BookOpen } from 'lucide-react';
import { Input } from 'antd';
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

interface GroupItem {
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  groupName?: string;
}

interface PostListClientProps {
  posts: PostItem[];
  groups: GroupItem[];
}

export function PostListClient({ posts, groups }: PostListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const { t, locale } = useI18n();

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGroup = !activeGroup ||
      p.slug.startsWith(activeGroup === '/' ? '/' : activeGroup + '/');
    return matchesSearch && matchesGroup;
  });

  const groupNames = [...new Set(groups.map((g) => g.groupName).filter(Boolean))] as string[];

  return (
    <div>
      {/* 搜索栏 */}
      <div className="flex flex-wrap gap-4 mb-10">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
          <Input
            placeholder={t('home.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base w-full rounded-2xl bg-white border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 transition-colors"
            size="large"
            variant="outlined"
            allowClear
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-zinc-200">
            <BookOpen size={16} className="text-zinc-400" />
            <span className="text-sm font-bold text-zinc-900">{filteredPosts.length}</span>
            <span className="text-xs text-zinc-400">{t('common.info') === '提示' ? '篇' : 'posts'}</span>
          </div>
        </div>
      </div>

      {/* 分组标签 */}
      {groupNames.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeGroup === null
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
                : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700'
            }`}
          >
            {t('posts.allPosts')}
          </button>
          {groupNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveGroup(name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeGroup === name
                  ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700'
              }`}
            >
              <Hash size={14} className="opacity-50" />
              {name}
            </button>
          ))}
        </div>
      )}

      {/* 帖子列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post, index) => (
            <motion.article
              key={post.slug}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group bg-white rounded-3xl border border-zinc-100 overflow-hidden hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-100/80 transition-all duration-500 flex flex-col"
            >
              <Link
                href={`/posts${post.slug}`}
                className="block overflow-hidden aspect-[3/2] bg-zinc-50 relative"
              >
                {post.cover ? (
                  <Image
                    src={post.cover}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
                    <span className="text-6xl font-black text-zinc-200 select-none group-hover:text-zinc-300 transition-colors duration-500">
                      {post.title.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                  <ArrowUpRight size={18} className="text-zinc-900" />
                </div>
              </Link>

              <div className="p-6 flex-1 flex flex-col">
                {/* 标签 */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 标题 */}
                <Link href={`/posts${post.slug}`} className="block group/title">
                  <h2 className="text-xl font-bold text-zinc-900 mb-3 line-clamp-2 leading-snug group-hover/title:text-zinc-600 transition-colors duration-200">
                    {post.title}
                  </h2>
                </Link>

                {/* 描述 */}
                {post.description && (
                  <p className="text-zinc-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {post.description}
                  </p>
                )}

                {/* 底部信息 */}
                <div className="mt-auto pt-4 border-t border-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                      <User size={12} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {post.author || t('home.anonymous')}
                    </span>
                  </div>
                  {post.date && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Calendar size={12} />
                      <span>
                        {new Date(post.date).toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {filteredPosts.length === 0 && (
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
      )}
    </div>
  );
}
