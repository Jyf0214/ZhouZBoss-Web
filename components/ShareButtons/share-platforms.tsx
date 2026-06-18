import React from 'react';
import type { PlatformDef, ShareConfig } from './types';

/* ============================================================
   平台图标
   ============================================================ */

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

/* ============================================================
   平台映射
   ============================================================ */

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

/** 模块级缓存，避免每次渲染重新构建 JSX 元素 */
let _platformsCache: Record<string, PlatformDef> | null = null;
function getPlatforms(): Record<string, PlatformDef> {
  _platformsCache ??= buildPlatforms();
  return _platformsCache;
}

/* ============================================================
   从 config 解析启用的平台列表
   ============================================================ */

function parsePlatformsFromConfig(config?: ShareConfig): string[] {
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

function useShareConfig(config?: ShareConfig) {
  const platformKeys = parsePlatformsFromConfig(config);
  const allPlatforms = getPlatforms();
  const platforms = platformKeys
    .filter(k => allPlatforms[k])
    .map(k => allPlatforms[k]!);

  return { platforms, hasShareJS: config?.sharejs?.enable, hasAddToAny: config?.addtoany?.enable };
}

export {
  buildPlatforms,
  getPlatforms,
  parsePlatformsFromConfig,
  useShareConfig,
};
