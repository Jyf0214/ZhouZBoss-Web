import React from 'react';
import type { ShareButtonItemProps } from './types';

/* ============================================================
   单个分享按钮
   ============================================================ */

export default function ShareButtonItem({
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
