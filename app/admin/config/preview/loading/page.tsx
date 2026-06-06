'use client';

import React, { useState } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import { Card, ColorPicker, Select } from 'antd';
import { Loader2, CircleDot, Sparkles, Orbit, Waves, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Color } from 'antd/es/color-picker';
import { Tag } from '@/components/ui/Tag';

type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface LoadingType {
  type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
  label: string;
  labelZh: string;
  description: string;
  icon: React.ElementType;
}

const positionOptions = [
  { value: 'center', label: '居中 (center)' },
  { value: 'top-left', label: '左上角 (top-left)' },
  { value: 'top-right', label: '右上角 (top-right)' },
  { value: 'bottom-left', label: '左下角 (bottom-left)' },
  { value: 'bottom-right', label: '右下角 (bottom-right)' },
];

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

function LoadingWavesWithColor({ color, tip }: { color: string; tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-1.5 h-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 rounded-full animate-wave"
            style={{
              height: '40%',
              backgroundColor: color,
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

function LoadingDotsWithColor({ color, tip }: { color: string; tip?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="loading-dots-animated">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              backgroundColor: i === 0 ? color : i === 1 ? `${color}cc` : `${color}88`,
            }}
          />
        ))}
      </div>
      {tip && <span className="text-sm text-zinc-400">{tip}</span>}
      <style jsx>{`
        .loading-dots-animated {
          display: flex;
          gap: 6px;
        }
        .loading-dots-animated span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }
        .loading-dots-animated span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots-animated span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots-animated span:nth-child(3) { animation-delay: 0s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function AnimationTypeGrid({
  selected,
  onChange,
  activeClass,
}: {
  selected: string;
  onChange: (type: string) => void;
  activeClass: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {loadingTypes.map((item) => {
        const ItemIcon = item.icon;
        const isActive = selected === item.type;
        return (
          <button
            key={item.type}
            onClick={() => onChange(item.type)}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              isActive ? activeClass : 'border-zinc-100 hover:border-zinc-200'
            }`}
          >
            <ItemIcon size={24} className={isActive ? 'text-white' : 'text-zinc-600'} />
            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-600'}`}>
              {item.labelZh}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LoadingPreviewContent({
  pageType,
  loadingColor,
  loadingPosition,
}: {
  pageType: string;
  loadingColor: string;
  loadingPosition: LoadingPosition;
}) {
  switch (pageType) {
    case 'spinner':
      return <GlobalLoading type="spinner" tip="加载中" position={loadingPosition} />;
    case 'antd':
      return <GlobalLoading type="antd" tip="加载中" position={loadingPosition} />;
    case 'text':
      return <GlobalLoading type="text" tip="加载中" position={loadingPosition} />;
    case 'dots':
      return <LoadingDotsWithColor color={loadingColor} tip="加载中" />;
    case 'glow':
      return <GlobalLoading type="glow" tip="加载中" />;
    case 'waves':
      return <LoadingWavesWithColor color={loadingColor} tip="加载中" />;
    default:
      return <GlobalLoading type="spinner" tip="加载中" position={loadingPosition} />;
  }
}

function PreviewArea({
  pageType,
  loadingColor,
  loadingPosition,
}: {
  pageType: string;
  loadingColor: string;
  loadingPosition: LoadingPosition;
}) {
  const alignItems = loadingPosition === 'top-left' || loadingPosition === 'top-right' ? 'flex-start' : loadingPosition.includes('bottom') ? 'flex-end' : 'center';
  const justifyContent = loadingPosition === 'center' ? 'center' : loadingPosition.includes('left') ? 'flex-start' : 'flex-end';
  const padding = loadingPosition === 'center' ? '4rem' : '2rem';

  return (
    <div
      className="bg-zinc-50 rounded-xl p-16 min-h-[200px]"
      style={{ display: 'flex', alignItems, justifyContent, padding }}
    >
      <LoadingPreviewContent pageType={pageType} loadingColor={loadingColor} loadingPosition={loadingPosition} />
    </div>
  );
}

function SizeComparisonCard({ t }: { t: (key: string) => string }) {
  return (
    <Card title={t('loadingPreview.sizeComparison') || '尺寸对比'} className="rounded-2xl border border-zinc-100">
      <div className="grid grid-cols-3 gap-8 py-8">
        <div className="flex flex-col items-center gap-4">
          <GlobalLoading type="spinner" size="small" />
          <Tag variant="light" size="sm">small</Tag>
        </div>
        <div className="flex flex-col items-center gap-4">
          <GlobalLoading type="spinner" size="default" />
          <Tag variant="light" size="sm">default</Tag>
        </div>
        <div className="flex flex-col items-center gap-4">
          <GlobalLoading type="spinner" size="large" />
          <Tag variant="light" size="sm">large</Tag>
        </div>
      </div>
    </Card>
  );
}

export default function LoadingPreviewPage() {
  const { t } = useI18n();
  const [pageType, setPageType] = useState<string>('waves');
  const [navType, setNavType] = useState<string>('antd');
  const [loadingColor, setLoadingColor] = useState<string>('#c084fc');
  const [loadingPosition, setLoadingPosition] = useState<LoadingPosition>('center');

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/config/preview"
          className="w-12 h-12 bg-zinc-100 hover:bg-zinc-200 rounded-2xl flex items-center justify-center transition-all"
        >
          <ArrowLeft size={22} className="text-zinc-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {t('loadingPreview.title') || '加载动画预览'}
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {t('loadingPreview.subtitle') || '预览所有可用的加载动画样式'}
          </p>
        </div>
      </div>

      {/* 加载动画列表 */}
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
                {loadingTypes.length} 种可用样式 · {t('loadingPreview.selectTip') || '选择一种动画进行预览'}
              </p>
            </div>
          </div>
        </Card>

        {/* 动画选择 */}
        <Card title={t('loadingPreview.select') || '选择动画'} className="rounded-2xl border border-zinc-100">
          <div className="space-y-6">
            <div>
              <div className="text-sm font-medium text-zinc-500 mb-3">轻加载 (pageType)</div>
              <AnimationTypeGrid selected={pageType} onChange={setPageType} activeClass="border-zinc-900 bg-zinc-900 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-500 mb-3">重加载 (navType)</div>
              <AnimationTypeGrid selected={navType} onChange={setNavType} activeClass="border-emerald-500 bg-emerald-500 text-white" />
            </div>
          </div>
        </Card>

        {/* 颜色选择 */}
        <Card title={t('loadingPreview.color') || '自定义颜色'} className="rounded-2xl border border-zinc-100">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <ColorPicker
                value={loadingColor}
                onChange={(color: Color) => setLoadingColor(color.toHexString())}
                size="large"
                showText
              />
            </div>
            <div className="text-sm text-zinc-400">
              当前颜色: <code className="bg-zinc-100 px-2 py-1 rounded ml-1">{loadingColor}</code>
            </div>
          </div>
        </Card>

        {/* 位置选择 */}
        <Card title={t('loadingPreview.position') || '加载位置'} className="rounded-2xl border border-zinc-100">
          <div className="flex flex-wrap items-center gap-6">
            <Select
              value={loadingPosition}
              onChange={(value: LoadingPosition) => setLoadingPosition(value)}
              options={positionOptions}
              style={{ width: 200 }}
              size="large"
            />
            <div className="text-sm text-zinc-400">
              配置: <code className="bg-zinc-100 px-2 py-1 rounded ml-1">appearance.loading.position = &quot;{loadingPosition}&quot;</code>
            </div>
          </div>
        </Card>

        {/* 预览区域 */}
        <Card title={t('loadingPreview.preview') || '效果预览'} className="rounded-2xl border border-zinc-100">
          <PreviewArea pageType={pageType} loadingColor={loadingColor} loadingPosition={loadingPosition} />
        </Card>

        <SizeComparisonCard t={t} />

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