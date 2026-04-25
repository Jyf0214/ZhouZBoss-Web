'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, Calendar, User, ArrowUpRight } from 'lucide-react';
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

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !activeGroup ||
      p.slug.startsWith(activeGroup === '/' ? '/' : activeGroup + '/');
    return matchesSearch && matchesGroup;
  });

  const groupNames = [...new Set(groups.map((g) => g.groupName).filter(Boolean))] as string[];

  return (
    <div>
      {/* 搜索和过滤 */}
      <div className="flex flex-wrap gap-4 mb-10">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
          <Input
            placeholder="搜索帖子..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base w-full rounded-2xl bg-white border-zinc-200"
            size="large"
            variant="outlined"
          />
        </div>
        <Button
          size="large"
          icon={<Filter size={18} />}
          className="bg-white hover:bg-zinc-50 border-zinc-200 rounded-2xl"
        >
          筛选
        </Button>
      </div>

      {/* 分组标签 */}
      {groupNames.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeGroup === null
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'
            }`}
          >
            全部
          </button>
          {groupNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveGroup(name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeGroup === name
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* 帖子列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredPosts.map((post) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group bg-white rounded-[2rem] border-2 border-zinc-50 overflow-hidden hover:border-zinc-900 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-zinc-100 flex flex-col"
            >
              <Link
                href={`/posts${post.slug}`}
                className="block overflow-hidden aspect-[16/10] bg-zinc-50 relative"
              >
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
                  <ArrowUpRight size={24} className="text-zinc-900" />
                </div>
              </Link>
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-100 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/posts${post.slug}`} className="block group/title">
                  <h2 className="text-2xl font-black text-zinc-900 mb-4 line-clamp-2 leading-tight group-hover/title:text-zinc-600 transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-zinc-400 text-sm line-clamp-2 mb-8 font-medium leading-relaxed">
                  {post.description || ''}
                </p>
                <div className="mt-auto pt-8 border-t border-zinc-50 flex items-center justify-between text-zinc-400">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-500">
                      <User size={14} />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-tighter">
                      {post.author || '匿名'}
                    </span>
                  </div>
                  {post.date && (
                    <div className="flex items-center gap-2 text-[10px] font-black">
                      <Calendar size={12} />
                      <span>
                        {new Date(post.date).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPosts.length === 0 && (
        <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-zinc-100 shadow-sm">
          <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
            <Sparkles size={40} />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-2">暂无帖子</h3>
          <p className="text-zinc-400 font-medium">在 /posts 目录下添加 Markdown 文件即可发布内容</p>
        </div>
      )}
    </div>
  );
}
