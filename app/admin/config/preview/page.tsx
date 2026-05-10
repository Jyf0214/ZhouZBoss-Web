'use client';

import React from 'react';
import { GlobalLoading } from '@/components/Loading';
import { Card } from 'antd';

const loadingTypes = [
  { type: 'spinner' as const, label: '环形 Spinner', description: '经典环形进度条（主流 UI 框架默认）' },
  { type: 'text' as const, label: 'Loading 文字', description: '文字 + 渐变文字动画（轻量简洁）' },
  { type: 'dots' as const, label: '三个点弹跳', description: '三个点依次弹跳（YouTube/Slack 风格）' },
  { type: 'glow' as const, label: '光晕渐变', description: '光晕效果渐变（现代毛玻璃风格）' },
];

export default function LoadingPreviewPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">加载动画预览</h1>
          <p className="text-zinc-500">预览所有可用的加载动画样式</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loadingTypes.map(({ type, label, description }) => (
            <Card key={type} title={label} className="shadow-sm">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <GlobalLoading type={type} />
                <p className="text-sm text-zinc-400 text-center">{description}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card title="带提示文字" className="shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
            {loadingTypes.map(({ type, label }) => (
              <div key={type} className="flex flex-col items-center gap-4">
                <GlobalLoading type={type} tip="加载中" />
                <span className="text-xs text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="不同尺寸" className="shadow-sm">
          <div className="grid grid-cols-3 gap-8 py-8">
            <div className="flex flex-col items-center gap-4">
              <GlobalLoading type="spinner" size="small" />
              <span className="text-xs text-zinc-400">small</span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <GlobalLoading type="spinner" size="default" />
              <span className="text-xs text-zinc-400">default</span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <GlobalLoading type="spinner" size="large" />
              <span className="text-xs text-zinc-400">large</span>
            </div>
          </div>
        </Card>

        <Card title="在页面中演示" className="shadow-sm">
          <div className="bg-zinc-100 rounded-xl p-16 flex items-center justify-center">
            <GlobalLoading type="spinner" tip="正在加载页面..." />
          </div>
        </Card>
      </div>
    </div>
  );
}