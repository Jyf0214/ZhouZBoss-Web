'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { ShareModalHeader } from './ShareModalHeader';
import { ShareModalGrid } from './ShareModalGrid';
import { ShareModalFooter } from './ShareModalFooter';
import { useCopyFeedback } from './use-copy-feedback';
import { MODAL_TRANSITION_EASE } from './share-modal-styles';
import type { PlatformDef, ShareModalProps } from './types';

/* ============================================================
   平台图标（复用 ShareButtons 中的 SVG）
   ============================================================ */

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46L20 4" />
    </svg>
  );
}

function FacebookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function WeiboIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.5 12.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 14.83 9 14s.67-1.5 1.5-1.5zm4-5c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5zm0-2A2.5 2.5 0 0 0 12 8c0 1.38 1.12 2.5 2.5 2.5S17 9.38 17 8a2.5 2.5 0 0 0-2.5-2.5zm0 8a4.5 4.5 0 0 1-4.5-4.5c0-1.04.35-2 .94-2.76C8.46 4.65 5.13 5 2 8.73V16c0 3.31 2.69 6 6 6s6-2.69 6-6c0-.88-.15-1.72-.42-2.5h-.08z" />
    </svg>
  );
}

function WeChatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.5 2C4.36 2 1 5.13 1 9c0 2.32 1.23 4.35 3.12 5.62L3 17l3.09-1.47c.76.24 1.57.38 2.41.47.08-.36.14-.72.18-1.09A7.95 7.95 0 0 1 8.5 2zm0 4c.83 0 1.5.67 1.5 1.5S9.33 9 8.5 9 7 8.33 7 7.5 7.67 6 8.5 6zm-3 0C6.33 6 7 6.67 7 7.5S6.33 9 5.5 9 4 8.33 4 7.5 4.67 6 5.5 6z" />
      <path d="M15.5 10c-3.31 0-6 2.69-6 6s2.69 6 6 6c.89 0 1.74-.2 2.5-.54L21 23l-1.12-2.6A6.7 6.7 0 0 0 21.5 16c0-3.31-2.69-6-6-6zm-2 4c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm4 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
    </svg>
  );
}

function QQIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 7.5c0 .83-.67 1.5-1.5 1.5S8 10.33 8 9.5 8.67 8 9.5 8s1.5.67 1.5 1.5zm5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-4.5 7c-2.5 0-4.5-.45-4.5-1.5 0-.55.67-1 1.5-1 1.33 0 2.67.5 3 .5s1.67-.5 3-.5c.83 0 1.5.45 1.5 1 0 1.05-2 1.5-4.5 1.5z" />
    </svg>
  );
}

function TelegramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 11.7c-.88-.28-.89-.88.2-1.3l16.2-6.24c.73-.28 1.35.18 1.09 1.3l-2.84 13.37c-.2.88-.72 1.1-1.46.69l-4.02-2.96-1.94 1.87c-.19.18-.35.34-.69.34z" />
    </svg>
  );
}

/* ============================================================
   平台注册表
   ============================================================ */

const ALL_PLATFORMS: Record<string, PlatformDef> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    color: '#000000',
    hoverColor: '#333333',
    icon: <XIcon size={28} />,
    shareUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    hoverColor: '#1664D9',
    icon: <FacebookIcon size={28} />,
    shareUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  weibo: {
    id: 'weibo',
    name: '微博',
    color: '#E6162D',
    hoverColor: '#C81023',
    icon: <WeiboIcon size={28} />,
    shareUrl: (url, title) =>
      `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  wechat: {
    id: 'wechat',
    name: '微信',
    color: '#07C160',
    hoverColor: '#06AD56',
    icon: <WeChatIcon size={28} />,
    shareUrl: () => null,
  },
  qq: {
    id: 'qq',
    name: 'QQ',
    color: '#12B7F5',
    hoverColor: '#0EA5E9',
    icon: <QQIcon size={28} />,
    shareUrl: (url, title) =>
      `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    color: '#0088CC',
    hoverColor: '#0077B3',
    icon: <TelegramIcon size={28} />,
    shareUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
};

/* ============================================================
   分享弹窗
   ============================================================ */

export default function ShareModal({
  open,
  onClose,
  url: urlProp,
  title: titleProp,
  platforms: platformOverride,
}: ShareModalProps) {
  const shareUrl = urlProp ?? (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = titleProp ?? (typeof document !== 'undefined' ? document.title : '');

  const displayPlatforms = platformOverride
    ? platformOverride.filter(k => ALL_PLATFORMS[k]).map(k => ALL_PLATFORMS[k]!)
    : Object.values(ALL_PLATFORMS);

  const { copied, toast, copy, showToast } = useCopyFeedback(shareUrl);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleShare = useCallback((platform: PlatformDef) => {
    if (platform.id === 'wechat') {
      showToast('请在微信中粘贴链接分享');
      return;
    }
    const url = platform.shareUrl(shareUrl, shareTitle);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=640,height=480');
    }
  }, [shareUrl, shareTitle, showToast]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 遮罩层 */}
          <motion.div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* 卡片 */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: MODAL_TRANSITION_EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <ShareModalHeader onClose={onClose} />
            <ShareModalGrid platforms={displayPlatforms} onShare={handleShare} />
            <ShareModalFooter shareUrl={shareUrl} copied={copied} onCopy={copy} />

            {/* 底部通知 */}
            {toast && (
              <Button variant="primary" autoLoading={false} className="absolute bottom-20 left-1/2 -translate-x-1/2 shadow-lg">
                {toast}
              </Button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
