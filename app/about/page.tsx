'use client';

import React, { useEffect, useState } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { HeroBanner } from '@/components/ui/HeroBanner';
import { BookOpen, Github, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FeedbackForm } from '@/components/FeedbackForm';

const features = [
  {
    icon: BookOpen,
    title: '内容管理',
    description: '基于 Markdown 的轻量级内容发布系统，支持文章、日记、通讯录等多种内容类型。',
  },
  {
    icon: Shield,
    title: '安全优先',
    description: '管理员后台严格隔离，日记内容加密存储，未授权用户无法访问隐私数据。',
  },
  {
    icon: Globe,
    title: '国际化',
    description: '内置多语言支持，可根据用户偏好切换界面语言，提供本地化阅读体验。',
  },
  {
    icon: Github,
    title: 'Git 驱动',
    description: '内容通过 Git 仓库同步管理，支持版本追溯、协作编辑与持续部署。',
  },
];

export default function AboutPage() {
  const [version, setVersion] = useState<string>('');
  useEffect(() => {
    fetch('/api/version').then(r => r.json()).then((d: { version: string }) => setVersion(d.version)).catch(() => { /* ignore */ });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <PageContainer maxWidth="5xl" padding="compact">
        <HeroBanner
          title="关于"
          description="了解这个项目 —— 现代内容发布平台"
          align="center"
          size="default"
          buttons={[
            {
              label: '浏览文章',
              variant: 'primary',
              icon: <BookOpen size={16} />,
              href: '/posts',
            },
          ]}
          className="mb-10 sm:mb-12"
        />

        {/* 项目简介 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4">项目介绍</h2>
          <p className="text-zinc-600 leading-relaxed">
            Originium Kernel 是一个基于 Next.js 构建的现代内容发布平台，专注于内容创作与管理的简洁体验。
            项目采用文件系统作为主要内容存储，数据库仅用于授权验证与最小化运行支撑，确保数据安全与可移植性。
          </p>
        </section>

        {/* 功能特点 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-6">功能特点</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 hover:border-zinc-200 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
                    <Icon size={20} className="text-zinc-700" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 技术栈 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4">技术栈</h2>
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Next.js 16 (App Router)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Tailwind CSS v4
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Prisma + SQLite
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Markdown / gray-matter
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                motion 动画库
              </li>
            </ul>
          </div>
        </section>

        {/* 版本信息 */}
        {version && (
          <section className="mb-10 sm:mb-12">
            <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 text-center">
              <p className="text-xs text-zinc-400 mb-1">当前版本</p>
              <p className="text-lg font-mono font-bold text-zinc-900">{version}</p>
            </div>
          </section>
        )}

        {/* 反馈 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-4">反馈与建议</h2>
          <FeedbackForm />
        </section>

        {/* 链接 */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/posts"
            >
            <Button variant="primary" size="lg" autoLoading={false}>
              <BookOpen size={16} />
              浏览文章
            </Button>
          </Link>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
