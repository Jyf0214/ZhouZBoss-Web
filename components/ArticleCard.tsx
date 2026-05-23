'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Calendar, ArrowUpRight, BookOpen, Clock } from 'lucide-react';
import { Avatar } from './Avatar';

import { type Article } from '@/types/content';

interface ArticleCardProps {
  article: Article;
}

function calcWordCount(text: string): { chars: number; readingTime: number } {
  const cleaned = text.replace(/[#*`\[\]()>|~_\-]/g, '').replace(/\s+/g, ' ').trim();
  const chineseChars = (cleaned.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishWords = cleaned.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  const totalChars = chineseChars + englishWords;
  const readingTime = Math.max(1, Math.ceil(totalChars / 300));
  return { chars: totalChars, readingTime };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const excerpt = article.content
    ? article.content.replace(/[#*`]/g, '').slice(0, 120)
    : '';

  const { chars, readingTime } = article.content ? calcWordCount(article.content) : { chars: 0, readingTime: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white rounded-[2rem] border-2 border-zinc-50 overflow-hidden hover:border-zinc-900 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-zinc-100 flex flex-col"
    >
      <Link href={`/user/${article.id}`} className="block overflow-hidden aspect-[16/10] bg-zinc-50 relative">
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-100 font-black text-6xl select-none">
            {article.title.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/10 transition-colors duration-500" />
        <div className="absolute top-6 right-6 w-12 h-12 bg-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 shadow-lg">
          <ArrowUpRight size={24} className="text-zinc-900" />
        </div>
      </Link>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-6">
          {article.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-100 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <Link href={`/user/${article.id}`} className="block group/title">
          <h2 className="text-2xl font-black text-zinc-900 mb-4 line-clamp-2 leading-tight group-hover/title:text-zinc-600 transition-colors">
            {article.title}
          </h2>
        </Link>
        <p className="text-zinc-400 text-sm line-clamp-2 mb-8 font-medium leading-relaxed">
          {excerpt}
        </p>
        <div className="mt-auto pt-8 border-t border-zinc-50 flex items-center justify-between text-zinc-400">
          <div className="flex items-center gap-3">
            <Avatar name={article.authorName} avatarUrl={article.authorAvatar} size={32} />
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-tighter">{article.authorName}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black">
            {chars > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                <span>{chars} 字</span>
              </span>
            )}
            {readingTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                <span>{readingTime} 分钟</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
