'use client';

import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  fallbackImg?: string;
}

/**
 * 头像组件 — 使用原生 <img> 渲染，不依赖 next/image 图片管线
 *
 * 原因：next/image 在 Next.js 16 中对外部 URL 的 unoptimized 处理存在不确定性，
 * 原生 <img> 更可靠且无需 remotePatterns 配置。
 */
export function Avatar({ name, avatarUrl, size = 32, fallbackImg }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  const showFallback = imgError && fallbackImg && !fallbackError;

  if (avatarUrl && !imgError) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 overflow-hidden shrink-0 max-w-full"
        style={{ width: size, height: size }}
      >
        { }
        <img
          src={avatarUrl}
          alt={name}
          className="block w-full h-full"
          style={{ objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (showFallback) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 overflow-hidden shrink-0 max-w-full"
        style={{ width: size, height: size }}
      >
        { }
        <img
          src={fallbackImg}
          alt={name}
          className="block w-full h-full"
          style={{ objectFit: 'cover' }}
          onError={() => setFallbackError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl bg-zinc-900 text-white font-bold shrink-0 max-w-full"
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials}</span>
    </div>
  );
}
