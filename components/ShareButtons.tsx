'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Share2, Check, MoreHorizontal } from 'lucide-react';
import ShareModal from './ShareModal';

/* ============================================================
   平台定义
   ============================================================ */

interface PlatformDef {
  id: string;
  name: string;
  color: string;
  hoverColor: string;
  icon: React.ReactNode;
  /** 返回分享 URL，返回 null 表示需要特殊处理（如复制链接） */
  shareUrl: (url: string, title: string) => string | null;
}

/** 极简 Twitter/X 图标 */
function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46L20 4" />
    </svg>
  );
}

/** 极简 Facebook 图标 — 圆角方块中的 f */
function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/** 极简微博图标 */
function WeiboIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.5 12.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 14.83 9 14s.67-1.5 1.5-1.5zm4-5c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5zm0-2A2.5 2.5 0 0 0 12 8c0 1.38 1.12 2.5 2.5 2.5S17 9.38 17 8a2.5 2.5 0 0 0-2.5-2.5zm0 8a4.5 4.5 0 0 1-4.5-4.5c0-1.04.35-2 .94-2.76C8.46 4.65 5.13 5 2 8.73V16c0 3.31 2.69 6 6 6s6-2.69 6-6c0-.88-.15-1.72-.42-2.5h-.08z" />
    </svg>
  );
}

/** 极简微信图标 — 两个对话气泡 */
function WeChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.5 2C4.36 2 1 5.13 1 9c0 2.32 1.23 4.35 3.12 5.62L3 17l3.09-1.47c.76.24 1.57.38 2.41.47.08-.36.14-.72.18-1.09A7.95 7.95 0 0 1 8.5 2zm0 4c.83 0 1.5.67 1.5 1.5S9.33 9 8.5 9 7 8.33 7 7.5 7.67 6 8.5 6zm-3 0C6.33 6 7 6.67 7 7.5S6.33 9 5.5 9 4 8.33 4 7.5 4.67 6 5.5 6z" />
      <path d="M15.5 10c-3.31 0-6 2.69-6 6s2.69 6 6 6c.89 0 1.74-.2 2.5-.54L21 23l-1.12-2.6A6.7 6.7 0 0 0 21.5 16c0-3.31-2.69-6-6-6zm-2 4c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm4 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
    </svg>
  );
}

/** 极简 QQ 图标 */
function QQIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 7.5c0 .83-.67 1.5-1.5 1.5S8 10.33 8 9.5 8.67 8 9.5 8s1.5.67 1.5 1.5zm5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-4.5 7c-2.5 0-4.5-.45-4.5-1.5 0-.55.67-1 1.5-1 1.33 0 2.67.5 3 .5s1.67-.5 3-.5c.83 0 1.5.45 1.5 1 0 1.05-2 1.5-4.5 1.5z" />
    </svg>
  );
}

/** 极简 Telegram 图标 — 纸飞机 */
function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 11.7c-.88-.28-.89-.88.2-1.3l16.2-6.24c.73-.28 1.35.18 1.09 1.3l-2.84 13.37c-.2.88-.72 1.1-1.46.69l-4.02-2.96-1.94 1.87c-.19.18-.35.34-.69.34z" />
    </svg>
  );
}

/** 构建全部平台映射 */
function buildPlatforms(): Record<string, PlatformDef> {
  return {
    twitter: {
      id: 'twitter',
      name: 'Twitter',
      color: '#000000',
      hoverColor: '#333333',
      icon: <XIcon size={20} />,
      shareUrl: (url, title) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    facebook: {
      id: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      hoverColor: '#1664D9',
      icon: <FacebookIcon size={20} />,
      shareUrl: (url) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    weibo: {
      id: 'weibo',
      name: '微博',
      color: '#E6162D',
      hoverColor: '#C81023',
      icon: <WeiboIcon size={20} />,
      shareUrl: (url, title) =>
        `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    wechat: {
      id: 'wechat',
      name: '微信',
      color: '#07C160',
      hoverColor: '#06AD56',
      icon: <WeChatIcon size={20} />,
      shareUrl: () => null, // 复制链接提示
    },
    qq: {
      id: 'qq',
      name: 'QQ',
      color: '#12B7F5',
      hoverColor: '#0EA5E9',
      icon: <QQIcon size={20} />,
      shareUrl: (url, title) =>
        `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    telegram: {
      id: 'telegram',
      name: 'Telegram',
      color: '#0088CC',
      hoverColor: '#0077B3',
      icon: <TelegramIcon size={20} />,
      shareUrl: (url, title) =>
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
  };
}

function getPlatforms(): Record<string, PlatformDef> {
  return buildPlatforms();
}

/* ============================================================
   内联 Toast 通知组件
   ============================================================ */

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium"
        >
          <Check size={16} className="text-green-400 shrink-0" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   单个分享按钮
   ============================================================ */

interface ShareButtonItemProps {
  platform: PlatformDef;
  url: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onCopy?: () => void;
  onClick?: () => void;
  onWeChat?: () => void;
}

function ShareButtonItem({
  platform,
  url,
  title,
  size = 'md',
  showLabel = false,
  onCopy,
  onClick,
  onWeChat,
}: ShareButtonItemProps) {
  const sizeMap = { sm: 9, md: 10, lg: 14 };
  const dim = sizeMap[size];

  const handleClick = () => {
    if (platform.id === 'wechat') {
      onWeChat?.();
      return;
    }

    onClick?.();

    const shareUrl = platform.shareUrl(url, title);
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=640,height=480');
    } else if (platform.id === 'copy' || platform.id === 'link') {
      onCopy?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none"
      style={{ width: `${dim * 4}px`, height: `${dim * 4}px` }}
      title={platform.name}
    >
      <span
        className="flex items-center justify-center w-full h-full rounded-xl text-white transition-colors duration-200"
        style={{ backgroundColor: platform.color }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = platform.hoverColor)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = platform.color)}
      >
        {platform.icon || (
          <span className="text-xs font-bold">{platform.name.charAt(0)}</span>
        )}
      </span>
      {showLabel && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-zinc-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {platform.name}
        </span>
      )}
    </button>
  );
}

/* ============================================================
   从 config 解析启用的平台列表
   ============================================================ */

function parsePlatformsFromConfig(config?: { sharejs?: { enable?: boolean; sites?: string }; addtoany?: { enable?: boolean; item?: string } } | null): string[] {
  if (!config) return ['twitter', 'facebook', 'weibo', 'wechat', 'qq', 'telegram'];

  if (config.sharejs?.enable && config.sharejs.sites) {
    return config.sharejs.sites.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (config.addtoany?.enable && config.addtoany.item) {
    // 将 addtoany 的平台名映射到我们的平台名
    const mapping: Record<string, string> = {
      twitter: 'twitter',
      facebook: 'facebook',
      sina_weibo: 'weibo',
      wechat: 'wechat',
      qq: 'qq',
      telegram: 'telegram',
      copy_link: 'copy',
      email: 'email',
    };
    return config.addtoany.item.split(',').map(s => mapping[s.trim()] ?? s.trim()).filter(Boolean);
  }

  return ['twitter', 'facebook', 'weibo', 'wechat', 'qq', 'telegram'];
}

/* ============================================================
   配置加载 hook
   ============================================================ */

function useShareConfig(config?: { sharejs?: { enable?: boolean; sites?: string }; addtoany?: { enable?: boolean; item?: string } } | null) {
  const platformKeys = parsePlatformsFromConfig(config);
  const allPlatforms = getPlatforms();
  const platforms = platformKeys
    .filter(k => allPlatforms[k])
    .map(k => allPlatforms[k]!);

  return { platforms, hasShareJS: config?.sharejs?.enable, hasAddToAny: config?.addtoany?.enable };
}

/* ============================================================
   Props
   ============================================================ */

export interface ShareButtonsProps {
  /** 布局模式：horizontal（默认） | floating | compact */
  variant?: 'horizontal' | 'floating' | 'compact';
  /** 直接指定要显示的平台的 id 列表（优先级高于 config） */
  platforms?: string[];
  /** 页面 URL，默认从 window.location.href 读取 */
  url?: string;
  /** 页面标题，默认从 document.title 读取 */
  title?: string;
  /** 从 config.yaml 传入的 share 配置 */
  config?: { sharejs?: { enable?: boolean; sites?: string }; addtoany?: { enable?: boolean; item?: string } } | null;
  /** 是否显示「更多」按钮（打开 ShareModal），默认 true（compact 模式下始终显示） */
  showMore?: boolean;
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
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-all hover:scale-110 active:scale-95"
            title="更多分享方式"
          >
            <MoreHorizontal size={16} />
          </button>
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
          {showMore && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-all hover:scale-110 active:scale-95"
              title="更多分享方式"
            >
              <MoreHorizontal size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-all hover:scale-110 active:scale-95"
            title="复制链接"
          >
            <Link2 size={18} />
          </button>
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
