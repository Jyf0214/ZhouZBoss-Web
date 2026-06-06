'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, UserCircle } from 'lucide-react';
import { Input } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/Tag';

export interface FaceItem {
  slug: string;
  title: string;
  date?: string;
  tags: string[];
  description?: string;
}

export interface GroupItem {
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
  const { t } = useI18n();

  // groupName → slug 前缀映射（如 "朋友圈" → "friends"）
  const groupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      if (g.groupName && g.slug) {
        // slug 如 "/friends"，取第一段
        const segment = g.slug.split('/').filter(Boolean)[0];
        if (segment) map.set(g.groupName, segment);
      }
    }
    return map;
  }, [groups]);

  const groupNames = useMemo(
    () => (Array.isArray(groups) ? [...new Set(groups.map((g) => g.groupName).filter(Boolean))] as string[] : []),
    [groups]
  );

  const filteredFaces = useMemo(() => {
    return faces.filter((f) => {
      const matchesSearch =
        !searchTerm ||
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesGroup = true;
      if (activeGroup) {
        const faceSlug = f.slug.split('/').filter(Boolean)[0] ?? null;
        // 通过 groupMap 将 groupName 转为 slug 前缀进行比较
        const expectedSlug = groupMap.get(activeGroup);
        matchesGroup = !!expectedSlug && faceSlug === expectedSlug;
      }

      return matchesSearch && matchesGroup;
    });
  }, [faces, searchTerm, activeGroup, groupMap]);

  return (
    <div>
      {/* 搜索框 */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none transition-colors" size={20} />
          <Input
            placeholder={t('faces.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-10 text-sm w-full rounded-xl bg-white border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 transition-colors"
            variant="outlined"
            prefix={<span className="w-3" />}
          />
        </div>
      </div>

      {/* 分组标签 + 数量统计 */}
      {groupNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveGroup(null)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeGroup === null
                ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/20'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
            }`}
          >
            {t('faces.allFaces')}
          </motion.button>
          {groupNames.map((name) => (
            <motion.button
              key={name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveGroup(name)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeGroup === name
                  ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/20'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
              }`}
            >
              {name}
            </motion.button>
          ))}
        </div>
      )}

      {/* 联系人数量统计 */}
      <div className="mb-6 text-sm text-zinc-500">
        {filteredFaces.length} {t('faces.contacts')}
      </div>

      {/* 联系人卡片列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredFaces.map((face) => (
            <motion.div
              key={face.slug}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="group bg-white rounded-2xl border border-zinc-100 p-6 overflow-hidden hover:shadow-xl hover:shadow-zinc-200/50 hover:-translate-y-1 transition-all duration-300"
            >
              <Link href={`/faces${face.slug}`} className="block">
                {/* 头像 */}
                <div className="w-20 h-20 bg-gradient-to-br from-zinc-100 to-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-100 group-hover:border-zinc-200 group-hover:from-zinc-200 group-hover:to-zinc-100 transition-all duration-300">
                  <UserCircle size={40} className="text-zinc-300 group-hover:text-zinc-500 transition-colors duration-300" />
                </div>
                {/* 姓名 */}
                <h3 className="text-lg font-bold text-zinc-900 text-center mb-2 group-hover:text-zinc-600 transition-colors duration-300">
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
                      <Tag key={tag} variant="light" size="sm">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      <AnimatePresence>
        {filteredFaces.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState
              variant="card"
              icon={
                <div className="w-24 h-24 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300">
                  <Users size={40} />
                </div>
              }
              title={t('faces.noFaces')}
              description={t('faces.noFacesHint')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
