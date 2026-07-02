'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  /** 控制灯箱可见性，用于 AnimatePresence 播放进出动画 */
  isOpen?: boolean;
}

export function Lightbox({ images, initialIndex, onClose, isOpen = true }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // initialIndex 外部变化时同步内部状态
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const total = images.length;
  const visible = isOpen && images.length > 0;

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % total);
  }, [total]);

  // ESC 关闭 + 左右箭头切换（仅灯箱可见时生效）
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose, goPrev, goNext]);

  // body scroll lock（仅灯箱可见时锁定）
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        /* 背景遮罩：opacity 进出过渡 */
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
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

          {/* 图片内容：scale + opacity 进出过渡 */}
          <motion.img
            key={`lightbox-img-${currentIndex}`}
            src={images[currentIndex]}
            alt=""
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[90vw] max-h-[90vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
