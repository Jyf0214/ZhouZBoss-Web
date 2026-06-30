'use client';

import Image from 'next/image';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * 800x450 灰色矩形 SVG（base64），用作 next/image blur placeholder
 * 16:9 比例，加载时显示柔和灰色过渡
 */
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIj48cmVjdCBmaWxsPSIjZTdlN2ViIiB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIvPjwvc3ZnPg==';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  /** 填充父容器模式（类似 next/image fill） */
  fill?: boolean;
  /** 响应式图片尺寸描述 */
  sizes?: string;
  onClick?: () => void;
}

/** 计算是否使用 fill 模式：显式 fill 或未提供宽高时回退 */
function resolveFill(fill?: boolean, width?: number, height?: number): boolean {
  return fill || (!width && !height);
}

/** 构建容器样式 */
function buildContainerStyle(
  useFill: boolean,
  width?: number,
  height?: number,
  style?: React.CSSProperties,
): React.CSSProperties {
  if (useFill) return { position: 'absolute', inset: 0, ...style };
  return {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    position: 'relative',
    ...style,
  };
}

export function LazyImage({
  src,
  alt,
  className,
  style,
  width,
  height,
  fill,
  sizes,
  onClick,
}: LazyImageProps) {
  const [status, setStatus] = useState<'idle' | 'loaded' | 'error'>('idle');
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // src 变化时重置加载状态
  useEffect(() => { setStatus('idle'); }, [src]);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setIsInView(true);
      }
    },
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersection, { rootMargin: '200px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersection]);

  const useFill = resolveFill(fill, width, height);
  const containerStyle = buildContainerStyle(useFill, width, height, style);
  const resolvedSizes = sizes ?? (useFill ? '100vw' : '(max-width: 768px) 100vw, 800px');

  if (status === 'error') {
    return (
      <div className={`bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center rounded-xl ${className ?? ''}`} style={containerStyle}>
        <ImageOff size={32} className="text-zinc-300 dark:text-zinc-600" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={containerStyle} onClick={onClick}>
      {status === 'idle' && (
        <div className={`absolute inset-0 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl ${className ?? ''}`} />
      )}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          fill={useFill}
          width={!useFill ? width : undefined}
          height={!useFill ? height : undefined}
          sizes={resolvedSizes}
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          className={`${status === 'loaded' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className ?? ''}`}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          style={!useFill
            ? { width: '100%', height: 'auto', objectFit: 'cover' }
            : { objectFit: 'cover' }
          }
        />
      )}
    </div>
  );
}
