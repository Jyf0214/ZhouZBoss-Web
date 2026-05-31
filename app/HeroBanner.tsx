'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

interface HeroBannerProps {
  tag?: string;
  title?: string;
  description?: string;
  link?: string;
  linkText?: string;
  enabled?: boolean;
}

/**
 * Hero 促销/推荐卡片 — 深色渐变背景，毛玻璃按钮
 * 位于首页 hero 标题下方，搜索框上方，可选显示
 */
export function HeroBanner({
  tag = '推荐',
  title = '探索无限可能',
  description = '使用 Originium Kernel 构建你的数字花园，记录思考，分享知识。',
  link = '/about',
  linkText = '了解更多',
  enabled = true,
}: HeroBannerProps) {
  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className="relative rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 overflow-hidden"
    >
      {/* 装饰性模糊光晕 */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/[0.02] rounded-full blur-xl" />

      <div className="relative p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 标签 */}
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={13} className="text-amber-400/80" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              {tag}
            </span>
          </div>

          {/* 标题 */}
          <h3 className="text-xl md:text-2xl font-bold text-white mb-1.5 leading-tight">
            {title}
          </h3>

          {/* 描述 */}
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
            {description}
          </p>
        </div>

        {/* 按钮 */}
        <Link
          href={link}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium hover:bg-white/20 hover:border-white/20 active:scale-[0.97] transition-all self-start md:self-center"
        >
          {linkText}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
