'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, BookOpen, Users, ArrowRight, Calendar, User as UserIcon } from 'lucide-react';
import { Input, Button } from 'antd';
import Image from 'next/image';

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
  siteTitle: string;
  siteDescription: string;
}

/**
 * 首页帖子网格 — 客户端组件，负责搜索/筛选交互
 */
export function HomePostGrid({ posts, postCount, facesCount, siteTitle, siteDescription }: HomePostGridProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = posts.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
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
          <span>Originium Kernel is Online</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 mb-8 leading-[0.95]"
        >
          Write. Sync. <br />
          <span className="text-zinc-300">Deploy.</span>
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
                placeholder="搜索内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-base w-full rounded-2xl bg-white border-zinc-200 hover:border-zinc-300 transition-colors"
                size="large"
                variant="outlined"
              />
            </div>
            <Button size="large" icon={<Filter size={20} />} className="bg-white hover:bg-zinc-50 border-zinc-200 rounded-2xl">
              排序
            </Button>
          </div>
        </motion.div>
      </section>

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
              <h2 className="text-xl font-bold text-zinc-900 mb-1">帖子</h2>
              <p className="text-zinc-400 text-sm">
                {postCount > 0 ? `${postCount} 篇帖子` : '浏览所有帖子'}
              </p>
            </div>
          </Link>
          <Link href="/faces" className="group">
            <div className="bg-white rounded-3xl border border-zinc-100 p-8 hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                  <Users size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-1">通讯录</h2>
              <p className="text-zinc-400 text-sm">
                {facesCount > 0 ? `${facesCount} 位联系人` : '浏览通讯录'}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* 帖子列表 */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-zinc-900">最新帖子</h2>
          {posts.length > 0 && (
            <Link href="/posts" className="text-sm text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors">
              查看全部 <ArrowRight size={14} />
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
                    <Link href={`/posts${post.slug}`} className="block overflow-hidden aspect-[16/10] bg-zinc-50 relative">
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
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex flex-wrap gap-2 mb-6">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-100 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Link href={`/posts${post.slug}`} className="block group/title">
                        <h3 className="text-2xl font-black text-zinc-900 mb-4 line-clamp-2 leading-tight group-hover/title:text-zinc-600 transition-colors">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="text-zinc-400 text-sm line-clamp-2 mb-8 font-medium leading-relaxed">
                        {post.description || ''}
                      </p>
                      <div className="mt-auto pt-8 border-t border-zinc-50 flex items-center justify-between text-zinc-400">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-500">
                            <UserIcon size={14} />
                          </div>
                          <span className="text-xs font-bold text-zinc-900 uppercase tracking-tighter">
                            {post.author || '匿名'}
                          </span>
                        </div>
                        {post.date && (
                          <div className="flex items-center gap-2 text-[10px] font-black">
                            <Calendar size={12} />
                            <span>
                              {new Date(post.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
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
                    <h3 className="text-2xl font-black text-zinc-900 mb-2">The kernel is empty</h3>
                    <p className="text-zinc-400 font-medium">
                      在 /posts 目录下添加 Markdown 文件即可发布内容
                    </p>
                  </div>
                )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
