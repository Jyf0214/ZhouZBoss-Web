'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useMarkdownConfig } from './use-markdown-config';
import { buildComponents } from './renderer-config';
import { Lightbox } from '@/components/ui/Lightbox';
import { LazyImage } from '@/components/ui/LazyImage';
import type { MarkdownRendererProps } from './types';

interface LightboxState {
  open: boolean;
  images: string[];
  index: number;
}

export function MarkdownRenderer({ content, highlight }: MarkdownRendererProps) {
  const { cfg, highlighter } = useMarkdownConfig(highlight);
  const [lightbox, setLightbox] = useState<LightboxState>({
    open: false,
    images: [],
    index: 0,
  });

  // 每次渲染时重置，img 组件按顺序 push 构建完整数组
  const imagesRef = useRef<string[]>([]);

  const components = buildComponents(cfg, highlighter);

  // 覆盖 img 组件，收集图片并处理点击，使用 LazyImage 懒加载
  const imgComponent = (props: Record<string, unknown>) => {
    const src = typeof props.src === 'string' ? props.src : '';
    const alt = typeof props.alt === 'string' ? props.alt : '';
    const index = imagesRef.current.length;
    imagesRef.current.push(src);

    return (
      <div
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          setLightbox({ open: true, images: imagesRef.current, index });
        }}
      >
        <LazyImage src={src} alt={alt} />
      </div>
    );
  };

  // 每次渲染前重置 ref
  imagesRef.current = [];

  return (
    <div className="prose prose-zinc max-w-none
      prose-headings:tracking-tight prose-headings:text-zinc-900
      prose-h1:text-4xl prose-h1:font-black prose-h1:mb-8 prose-h1:mt-16
      prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-14 prose-h2:pb-3 prose-h2:border-b prose-h2:border-zinc-100
      prose-h3:text-xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10
      prose-p:text-zinc-600 prose-p:leading-[1.8] prose-p:text-[15px]
      prose-a:text-zinc-900 prose-a:font-semibold prose-a:underline prose-a:decoration-zinc-300 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-900
      prose-strong:text-zinc-900 prose-strong:font-bold
      prose-blockquote:border-zinc-900 prose-blockquote:bg-zinc-50 prose-blockquote:rounded-r-2xl prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-zinc-600
      prose-li:text-zinc-600 prose-li:text-[15px]
      prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100
      prose-hr:border-zinc-100 prose-hr:my-12
    ">
      <ReactMarkdown components={{ ...components, img: imgComponent as never }}>
        {content}
      </ReactMarkdown>
      {lightbox.open && (
        <Lightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        />
      )}
    </div>
  );
}
