'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const total = images.length;

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % total);
  }, [total]);

  // ESC 关闭 + 左右箭头切换
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  // body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        type="button"
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="关闭灯箱"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 左箭头 */}
      {total > 1 && (
        <button
          type="button"
          className="absolute left-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="上一张"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* 图片 */}
      <img
        src={images[currentIndex]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 右箭头 */}
      {total > 1 && (
        <button
          type="button"
          className="absolute right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="下一张"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* 底部计数器 */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
          {currentIndex + 1} / {total}
        </div>
      )}
    </div>
  );
}
