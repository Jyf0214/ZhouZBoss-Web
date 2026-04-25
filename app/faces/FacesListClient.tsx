'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, Sparkles, UserCircle } from 'lucide-react';
import { Input } from 'antd';

interface FaceItem {
  slug: string;
  title: string;
  date?: string;
  tags: string[];
  description?: string;
  content: string;
}

interface GroupItem {
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  groupName?: string;
}

interface FacesListClientProps {
  faces: FaceItem[];
  groups: GroupItem[];
}

export function FacesListClient({ faces, groups }: FacesListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const filteredFaces = faces.filter((f) => {
    const matchesSearch =
      !searchTerm ||
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup =
      !activeGroup ||
      f.slug.startsWith(activeGroup === '/' ? '/' : activeGroup + '/');

    return matchesSearch && matchesGroup;
  });

  const groupNames = [...new Set(groups.map((g) => g.groupName).filter(Boolean))] as string[];

  return (
    <div>
      {/* 搜索 */}
      <div className="flex flex-wrap gap-4 mb-10">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
          <Input
            placeholder="搜索联系人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base w-full rounded-2xl bg-white border-zinc-200"
            size="large"
            variant="outlined"
          />
        </div>
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

      {/* 联系人卡片列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredFaces.map((face) => (
            <motion.div
              key={face.slug}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group bg-white rounded-3xl border border-zinc-100 overflow-hidden hover:border-zinc-300 hover:shadow-lg transition-all duration-300"
            >
              <Link href={`/faces${face.slug}`} className="block p-6">
                {/* 头像 */}
                <div className="w-20 h-20 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-100 group-hover:border-zinc-300 transition-colors">
                  <UserCircle size={40} className="text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                </div>

                {/* 姓名 */}
                <h3 className="text-xl font-bold text-zinc-900 text-center mb-2 group-hover:text-zinc-600 transition-colors">
                  {face.title}
                </h3>

                {/* 描述 */}
                {face.description && (
                  <p className="text-zinc-400 text-sm text-center line-clamp-2 mb-3">
                    {face.description}
                  </p>
                )}

                {/* 标签 */}
                {face.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {face.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredFaces.length === 0 && (
        <div className="py-32 text-center bg-white rounded-[3rem] border border-zinc-100 shadow-sm">
          <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
            <Users size={40} />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mb-2">暂无联系人</h3>
          <p className="text-zinc-400 font-medium">在 /faces 目录下添加 Markdown 文件即可创建联系人</p>
        </div>
      )}
    </div>
  );
}
