// FooterAvatar - 头像/Logo 居中按钮，点击回到顶部
// 与 FooterSocial 配对使用：左右两侧渲染社交图标，本组件居中。

'use client';

import React, { useCallback } from 'react';
import { Globe } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export interface FooterAvatarProps {
  avatarUrl?: string;
  /** 周围是否需要间距（用于让位给左右社交图标） */
  hasSiblings?: boolean;
}

/**
 * 居中的头像 / Logo 按钮。
 * - 有 avatarUrl 时渲染 <img> 头像；
 * - 无头像时渲染 Globe 占位；
 * - 点击平滑滚动到顶部。
 */
export function FooterAvatar({ avatarUrl, hasSiblings = false }: FooterAvatarProps) {
  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <Button
      variant="ghost"
      rounded="full"
      className={hasSiblings ? 'mx-6' : ''}
      title="回到顶部"
      autoLoading={false}
      onClick={handleScrollTop}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Logo"
          className="w-16 h-16 rounded-full border-2 border-zinc-200 object-cover hover:border-zinc-400 transition-colors duration-300"
        />
      ) : (
        <div className="w-16 h-16 rounded-full border-2 border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 hover:border-zinc-400 transition-colors duration-300">
          <Globe className="w-6 h-6" />
        </div>
      )}
    </Button>
  );
}

export default FooterAvatar;
