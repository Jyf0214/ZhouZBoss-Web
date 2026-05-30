'use client';

import React from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { Card } from 'antd';
import { Loader2, Palette, Server } from 'lucide-react';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageContainer';

interface CategoryItem {
  key: string;
  label: string;
  labelZh: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const categories: CategoryItem[] = [
  {
    key: 'loading',
    label: 'Loading Animations',
    labelZh: '加载动画',
    description: '进度条、加载指示器等动画效果',
    href: '/admin/config/preview/loading',
    icon: Loader2,
  },
  {
    key: 'theme',
    label: 'Theme',
    labelZh: '主题配色',
    description: '主题颜色、渐变、阴影等配置',
    href: '/admin/config/preview/theme',
    icon: Palette,
  },
];

function CategoryCard({ item }: { item: CategoryItem }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="block">
      <Card
        hoverable
        className="rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
            <Icon size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-zinc-900 mb-1">{item.labelZh}</h3>
            <p className="text-sm text-zinc-400">{item.description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function ConfigPreviewPage() {
  const { t } = useI18n();

  return (
    <PageContainer maxWidth="5xl">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200">
          <Palette size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {t('configPreview.title') || '配置预览'}
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {t('configPreview.subtitle') || '预览和配置各种界面元素'}
          </p>
        </div>
      </div>

      {/* 分类列表 */}
      <div className="space-y-6">
        <Card
          className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50"
          bordered={false}
        >
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Server size={28} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-zinc-900 mb-1">
                {t('configPreview.categories') || '预览分类'}
              </h2>
              <p className="text-zinc-500 text-sm">
                点击进入详细预览页
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((item) => (
            <CategoryCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}