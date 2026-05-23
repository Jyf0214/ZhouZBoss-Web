'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  fallbackImg?: string;
}

/** 自定义 loader：直接返回原始 URL，不做域名限制 */
function avatarLoader({ src }: { src: string }) {
  return src;
}

export function Avatar({ name, avatarUrl, size = 32, fallbackImg }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  const showFallback = imgError && fallbackImg && !fallbackError;

  if (avatarUrl && !imgError) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          loader={avatarLoader}
          unoptimized
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (showFallback) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={fallbackImg}
          alt={name}
          width={size}
          height={size}
          loader={avatarLoader}
          unoptimized
          className="w-full h-full object-cover"
          onError={() => setFallbackError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl bg-zinc-900 text-white font-bold shrink-0"
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials}</span>
    </div>
  );
}
