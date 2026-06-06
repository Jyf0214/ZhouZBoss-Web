'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { Link2, Share2, Check } from 'lucide-react';
import ShareModal from '../ShareModal';
import { Button } from '@/components/ui/Button';
import type { ShareButtonsProps } from './types';
import { getPlatforms, useShareConfig } from './share-platforms';
import ShareButtonItem from './ShareButtonItem';
import ShareMoreButton from './ShareMoreButton';
import ShareCopyButton from './ShareCopyButton';

/* ============================================================
   重新导出类型，保持对外 API 兼容
   ============================================================ */

export type { ShareButtonsProps, PlatformDef, ShareButtonItemProps, ShareConfig } from './types';

/* ============================================================
   内联 Toast 通知组件
   ============================================================ */

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <Button variant="primary" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] shadow-2xl">
          <Check size={16} className="text-green-400 shrink-0" />
          {message}
        </Button>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   主组件
   ============================================================ */

export default function ShareButtons({
  variant = 'horizontal',
  platforms: platformOverride,
  url: urlProp,
  title: titleProp,
  config,
  showMore = true,
}: ShareButtonsProps) {
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shareUrl = urlProp ?? (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = titleProp ?? (typeof document !== 'undefined' ? document.title : '');

  // 平台列表：优先使用 prop 传入的，否则从 config 解析
  const allPlatforms = getPlatforms();
  const { platforms: configPlatforms } = useShareConfig(config);
  const displayPlatforms = platformOverride
    ? platformOverride.filter(k => allPlatforms[k]).map(k => allPlatforms[k]!)
    : configPlatforms.length > 0
      ? configPlatforms
      : ['twitter', 'facebook', 'weibo'].map(k => allPlatforms[k]!);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('链接已复制');
    } catch {
      showToast('复制失败');
    }
  }, [shareUrl, showToast]);

  const handleWeChat = useCallback(() => {
    showToast('请在微信中粘贴链接分享');
  }, [showToast]);

  // 清理 timer
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /* ——— 浮动布局 ——— */
  if (variant === 'floating') {
    return (
      <>
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3">
          <div className="flex flex-col gap-2 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/60 p-2 shadow-lg">
            {displayPlatforms.slice(0, 5).map((p) => (
              <ShareButtonItem
                key={p.id}
                platform={p}
                url={shareUrl}
                title={shareTitle}
                size="sm"
                onCopy={handleCopyLink}
                onWeChat={handleWeChat}
              />
            ))}
            <div className="w-full h-px bg-zinc-100 my-1" />
            <ShareButtonItem
              platform={{
                id: 'copy',
                name: '复制链接',
                color: '#27272a',
                hoverColor: '#18181b',
                icon: <Link2 size={16} />,
                shareUrl: () => null,
              }}
              url={shareUrl}
              title={shareTitle}
              size="sm"
              onCopy={handleCopyLink}
            />
          </div>
        </div>
        <Toast message={toastMessage} visible={toastVisible} />
      </>
    );
  }

  /* ——— 紧凑布局 ——— */
  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-400 mr-1">分享</span>
          {displayPlatforms.slice(0, 4).map((p) => (
            <ShareButtonItem
              key={p.id}
              platform={p}
              url={shareUrl}
              title={shareTitle}
              size="sm"
              onCopy={handleCopyLink}
              onWeChat={handleWeChat}
            />
          ))}
          <ShareMoreButton size="sm" onClick={() => setModalOpen(true)} />
        </div>
        <Toast message={toastMessage} visible={toastVisible} />
        <ShareModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          url={shareUrl}
          title={shareTitle}
          platforms={displayPlatforms.map(p => p.id)}
        />
      </>
    );
  }

  /* ——— 水平布局（默认） ——— */
  const visiblePlatforms = showMore ? displayPlatforms : displayPlatforms.slice(0, 6);

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-400 mr-1 flex items-center gap-1.5">
          <Share2 size={14} />
          分享
        </span>
        <div className="flex items-center gap-2">
          {visiblePlatforms.map((p) => (
            <ShareButtonItem
              key={p.id}
              platform={p}
              url={shareUrl}
              title={shareTitle}
              onCopy={handleCopyLink}
              onWeChat={handleWeChat}
            />
          ))}
          {showMore && <ShareMoreButton size="md" onClick={() => setModalOpen(true)} />}
          <ShareCopyButton onClick={handleCopyLink} />
        </div>
      </div>
      <Toast message={toastMessage} visible={toastVisible} />
      <ShareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        url={shareUrl}
        title={shareTitle}
        platforms={displayPlatforms.map(p => p.id)}
      />
    </>
  );
}
