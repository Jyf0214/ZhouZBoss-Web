'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ArticleCard } from '@/components/ArticleCard';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, BookOpen, Users, ArrowRight } from 'lucide-react';
import { Input, Button } from 'antd';
import { Flexbox, Text } from '@lobehub/ui';
import Link from 'next/link';

interface PostItem {
  slug: string;
  title: string;
  date?: string;
  author?: string;
  tags: string[];
  cover?: string;
  description?: string;
}

interface FaceItem {
  slug: string;
  title: string;
  tags: string[];
  description?: string;
}

export default function HomePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [faces, setFaces] = useState<FaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取数据库文章（兼容旧系统）
        const articlesRes = await fetch('/api/articles');
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticles(data.filter((a: any) => a.status === 'published'));
        }
      } catch (error) {
        console.error('Fetch articles error:', error);
      }

      try {
        // 获取本地文件帖子
        const postsRes = await fetch('/api/posts');
        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Fetch posts error:', error);
      }

      try {
        // 获取通讯录
        const facesRes = await fetch('/api/faces');
        if (facesRes.ok) {
          const data = await facesRes.json();
          setFaces(data.faces || []);
        }
      } catch (error) {
        console.error('Fetch faces error:', error);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <Flexbox className="flex-1 max-w-7xl mx-auto w-full" horizontal>
        <main className="flex-1 p-6 md:p-10">
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
              <Flexbox gap={12} horizontal className="items-center max-w-2xl">
                <div className="relative flex-1 w-full">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors"
                    size={20}
                  />
                  <Input
                    placeholder="搜索内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-base w-full rounded-2xl bg-white border-zinc-200 hover:border-zinc-300 transition-colors"
                    size="large"
                    variant="outlined"
                  />
                </div>
                <Button
                  size="large"
                  icon={<Filter size={20} />}
                  className="bg-white hover:bg-zinc-50 border-zinc-200 rounded-2xl"
                >
                  排序
                </Button>
              </Flexbox>
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
                    {posts.length > 0 ? `${posts.length} 篇帖子` : '浏览所有帖子'}
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
                    {faces.length > 0 ? `${faces.length} 位联系人` : '浏览通讯录'}
                  </p>
                </div>
              </Link>
            </div>
          </section>

          {/* 数据库文章（兼容旧系统） */}
          <section className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="lobe-card p-8 h-80 animate-pulse bg-white rounded-3xl border border-zinc-100 shadow-sm"
                  />
                ))
              ) : filteredArticles.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {filteredArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </AnimatePresence>
              ) : (
                !loading && articles.length === 0 && posts.length === 0 && (
                  <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-zinc-100 shadow-sm">
                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                      <Sparkles size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 mb-2">The kernel is empty</h3>
                    <p className="text-zinc-400 font-medium">
                      在 /posts 目录下添加 Markdown 文件即可发布内容
                    </p>
                  </div>
                )
              )}
            </div>
          </section>

          {/* 本地帖子预览 */}
          {!loading && posts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-zinc-900">最新帖子</h2>
                <Link
                  href="/posts"
                  className="text-sm text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                >
                  查看全部 <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {posts.slice(0, 4).map((post) => (
                  <Link key={post.slug} href={`/posts${post.slug}`} className="group">
                    <div className="bg-white rounded-3xl border border-zinc-100 p-6 hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-100 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-zinc-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className="text-zinc-400 text-sm line-clamp-2">{post.description}</p>
                      )}
                      {post.date && (
                        <p className="text-zinc-300 text-xs mt-3">
                          {new Date(post.date).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </Flexbox>
    </div>
  );
}
