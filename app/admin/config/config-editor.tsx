'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Settings, Save } from 'lucide-react';
import GitHubStatus from '@/components/ui/GitHubStatus';
import ConfigFormBody from './config-form-body';
import type { ConfigState } from './config-builders';
import { cn } from '@/lib/ui';

/** 侧边导航配置项 */
const sections = [
  { id: 'section-general', label: '基本信息' },
  { id: 'section-auth', label: '认证' },
  { id: 'section-access', label: '访问控制' },
  { id: 'section-background', label: '背景' },
  { id: 'section-custom-css', label: '自定义 CSS' },
  { id: 'section-custom-head', label: '自定义 Head' },
  { id: 'section-nav', label: '导航栏' },
  { id: 'section-mourn', label: '哀悼日' },
  { id: 'section-highlight', label: '代码高亮' },
  { id: 'section-copy', label: '复制设置' },
  { id: 'section-social', label: '社交链接' },
  { id: 'section-author', label: '作者卡片' },
  { id: 'section-cover', label: '封面设置' },
  { id: 'section-error', label: '错误图片' },
  { id: 'section-postmeta', label: '文章元信息' },
  { id: 'section-wordcount', label: '字数统计' },
  { id: 'section-toc', label: '目录' },
  { id: 'section-copyright', label: '版权信息' },
  { id: 'section-reward', label: '打赏' },
  { id: 'section-postedit', label: '在线编辑' },
  { id: 'section-share', label: '分享' },
  { id: 'section-maintone', label: '主色调' },
  { id: 'section-footer', label: '页脚' },
  { id: 'section-loading', label: '加载动画' },
];

function ConfigPageHeader({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
        <Settings size={18} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('config.title')}</h1>
        <p className="text-sm text-zinc-400">{t('config.subtitle')}</p>
      </div>
    </div>
  );
}

function RemoteFetchErrorAlert({ error }: { error: string }) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-red-800">无法拉取远程配置文件</h2>
          <p className="text-sm text-red-600">
            无法从 GitHub 读取 config.yaml，请检查仓库权限和令牌配置
          </p>
        </div>
      </div>
      <div className="bg-red-100/50 rounded-xl p-4 font-mono text-xs text-red-700 whitespace-pre-wrap break-all">
        {error || '未知错误'}
      </div>
      <p className="mt-3 text-xs text-red-500">
        保存功能暂时不可用，请修复后刷新页面重试
      </p>
    </div>
  );
}

/**
 * 侧边锚点导航栏 — 仅 lg 以上屏幕显示，固定在左侧
 */
function SidebarNav({ activeId }: { activeId: string }) {
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="hidden lg:block fixed left-6 top-1/2 -translate-y-1/2 z-40 w-40 max-h-[70vh] overflow-y-auto scrollbar-thin">
      <div className="space-y-0.5">
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => handleClick(sec.id)}
            className={cn(
              'block w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200',
              activeId === sec.id
                ? 'text-zinc-900 font-medium bg-zinc-200/60'
                : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100',
            )}
          >
            {sec.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function ConfigEditor({
  config,
  onConfigChange,
  t,
  githubConfigured,
  remoteConfigStatus,
  remoteConfigError,
  saving,
  DiffModal,
  onSave,
}: {
  config: ConfigState;
  onConfigChange: (config: ConfigState) => void;
  t: (key: string) => string;
  githubConfigured: boolean;
  remoteConfigStatus: string;
  remoteConfigError: string;
  saving: boolean;
  DiffModal: React.ReactNode;
  onSave: () => void;
}) {
  const remoteFetchFailed = !!(remoteConfigStatus === 'error' && githubConfigured);

  /** 当前激活的分区 ID（用于侧边导航高亮） */
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** 使用 IntersectionObserver 监听各分区进入视口 */
  const setupObserver = useCallback(() => {
    // 清理旧观察器
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
        });

        // 选择可见比例最高的分区作为激活项
        if (visibleSections.size > 0) {
          let bestId = sections[0]?.id ?? '';
          let bestRatio = 0;
          visibleSections.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          });
          setActiveSection(bestId);
        }
      },
      {
        rootMargin: '-80px 0px -40% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    // 观察所有分区元素
    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) {
        observerRef.current?.observe(el);
      }
    });
  }, []);

  useEffect(() => {
    // 使用 requestAnimationFrame 重试等待 DOM 渲染完成，
    // 比固定 setTimeout(100) 更可靠：表单渲染慢时也能等到元素出现
    let rafId: number;
    let retries = 0;
    const MAX_RETRIES = 60; // ~1秒@60fps
    const retrySetup = () => {
      const sectionEls = document.querySelectorAll('[id^="section-"]');
      if (sectionEls.length === 0) {
        if (retries < MAX_RETRIES) {
          retries++;
          rafId = requestAnimationFrame(retrySetup);
        }
        return;
      }
      setupObserver();
    };
    rafId = requestAnimationFrame(retrySetup);
    return () => {
      cancelAnimationFrame(rafId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 侧边锚点导航 */}
      <SidebarNav activeId={activeSection} />

      {/* 主内容区：左侧留出导航空间 */}
      <div className="p-6 lg:pl-56 max-w-4xl mx-auto space-y-4">
        {/* 顶部工具栏：标题 + 保存按钮 */}
        <div className="flex items-center justify-between">
          <ConfigPageHeader t={t} />
          <div className="flex items-center gap-3">
            <GitHubStatus
              configured={githubConfigured}
              configuredText="已配置"
              notConfiguredText="未配置"
            />
            <Button
              variant="primary"
              size="md"
              icon={<Save size={16} />}
              onClick={onSave}
              loading={saving}
              disabled={!githubConfigured || remoteFetchFailed}
            >
              保存配置
            </Button>
          </div>
        </div>

        {remoteFetchFailed && (
          <RemoteFetchErrorAlert error={remoteConfigError} />
        )}

        <ConfigFormBody config={config} onConfigChange={onConfigChange} t={t} />

        {DiffModal}
      </div>
    </div>
  );
}
