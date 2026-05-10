'use client';

import React from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import { Card } from 'antd';
import { Loader2, Sparkles, CircleDot, Waves, Orbit } from 'lucide-react';

interface LoadingType {
  type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
  label: string;
  labelZh: string;
  description: string;
  icon: React.ElementType;
}

const loadingTypes: LoadingType[] = [
  {
    type: 'spinner',
    label: 'Spinner',
    labelZh: '环形加载',
    description: '经典环形进度条（主流 UI 框架默认）',
    icon: CircleDot,
  },
  {
    type: 'antd',
    label: 'Ant Icon',
    labelZh: 'Ant Design 图标',
    description: 'Ant Design LoadingOutlined 图标旋转',
    icon: Loader2,
  },
  {
    type: 'text',
    label: 'Text',
    labelZh: '文字动画',
    description: '文字 + 渐变文字动画（轻量简洁）',
    icon: Loader2,
  },
  {
    type: 'dots',
    label: 'Dots',
    labelZh: '三色弹跳',
    description: '三个点依次弹跳（YouTube/Slack 风格）',
    icon: Sparkles,
  },
  {
    type: 'glow',
    label: 'Glow',
    labelZh: '光晕渐变',
    description: '光晕效果渐变（现代毛玻璃风格）',
    icon: Orbit,
  },
  {
    type: 'waves',
    label: 'Waves',
    labelZh: '波浪动画',
    description: '多条波浪依次动画（Discord 风格）',
    icon: Waves,
  },
];

const loadingComponents: Record<string, React.ComponentType<{ tip?: string; size?: 'small' | 'default' | 'large' }>> = {
  spinner: ({ tip, size }) => <div className="flex items-center justify-center"><GlobalLoading type="spinner" tip={tip} size={size} /></div>,
  antd: ({ tip, size }) => <div className="flex items-center justify-center"><GlobalLoading type="antd" tip={tip} size={size} /></div>,
  text: ({ tip }) => <div className="flex items-center justify-center"><GlobalLoading type="text" tip={tip} /></div>,
  dots: ({ tip }) => <div className="flex items-center justify-center"><GlobalLoading type="dots" tip={tip} /></div>,
  glow: ({ tip }) => <div className="flex items-center justify-center"><GlobalLoading type="glow" tip={tip} /></div>,
  waves: ({ tip }) => <div className="flex items-center justify-center"><LoadingWaves tip={tip} /></div>,
};

function LoadingWaves({ tip = 'Loading...' }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-1.5 h-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 bg-zinc-900 rounded-full animate-wave"
            style={{
              height: '40%',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      {tip && <span className="text-sm text-zinc-400">{tip}</span>}
      <style jsx>{`
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
        @keyframes wave {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}

function LoadingPreviewCard({ item }: { item: LoadingType }) {
  const LoadingComponent = loadingComponents[item.type] || loadingComponents.spinner;
  const Icon = item.icon;

  return (
    <Card className="rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-zinc-900 mb-1">{item.labelZh}</h3>
          <p className="text-sm text-zinc-400 mb-4">{item.description}</p>
          <div className="bg-zinc-50 rounded-xl p-8 flex items-center justify-center">
            <LoadingComponent tip="加载中" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
            <code className="bg-zinc-100 px-2 py-1 rounded">{item.type}</code>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LoadingPreviewPage() {
  const { t } = useI18n();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-200">
          <Loader2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {t('loadingPreview.title') || '加载动画预览'}
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {t('loadingPreview.subtitle') || '预览所有可用的加载动画样式'}
          </p>
        </div>
      </div>

      {/* 加载动画分类 */}
      <div className="space-y-6">
        <Card
          className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50"
          bordered={false}
        >
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Loader2 size={28} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-zinc-900 mb-1">
                {t('loadingPreview.category') || '进度条/加载动画'}
              </h2>
              <p className="text-zinc-500 text-sm">
                {loadingTypes.length} 种可用样式 · {t('loadingPreview.selectTip') || '在 next.config.ts 中配置 appearance.loading.type'}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loadingTypes.map((item) => (
            <LoadingPreviewCard key={item.type} item={item} />
          ))}
        </div>

        {/* 尺寸对比 */}
        <Card title={t('loadingPreview.sizeComparison') || '尺寸对比'} className="rounded-2xl border border-zinc-100">
          <div className="grid grid-cols-3 gap-8 py-8">
            <div className="flex flex-col items-center gap-4">
              <GlobalLoading type="spinner" size="small" />
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded">small</span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <GlobalLoading type="spinner" size="default" />
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded">default</span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <GlobalLoading type="spinner" size="large" />
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded">large</span>
            </div>
          </div>
        </Card>

        {/* 页面演示 */}
        <Card title={t('loadingPreview.demo') || '页面演示'} className="rounded-2xl border border-zinc-100">
          <div className="bg-zinc-100 rounded-xl p-16 flex items-center justify-center">
            <GlobalLoading type="spinner" tip="正在加载页面..." />
          </div>
        </Card>
      </div>
    </div>
  );
}