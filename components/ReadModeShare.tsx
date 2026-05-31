'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

interface ReadModeShareProps {
  /** 页面 URL，默认从 window.location.href 读取 */
  url?: string;
  /** 页面标题，默认从 document.title 读取 */
  title?: string;
  /** 可用的分享平台列表 */
  platforms?: string[];
}

/**
 * 阅读模式浮动分享按钮
 * 固定在页面右上角，毛玻璃风格
 * 点击弹出 ShareModal
 */
export default function ReadModeShare({
  url: urlProp,
  title: titleProp,
  platforms,
}: ReadModeShareProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const shareUrl = urlProp ?? (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = titleProp ?? (typeof document !== 'undefined' ? document.title : '');

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="fixed top-24 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-200"
        title="分享此页面"
      >
        <Share2 size={20} />
      </button>

      <ShareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        url={shareUrl}
        title={shareTitle}
        platforms={platforms}
      />
    </>
  );
}
