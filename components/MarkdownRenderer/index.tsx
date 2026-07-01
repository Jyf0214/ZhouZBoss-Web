'use client';

import { useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMarkdownConfig } from './use-markdown-config';
import { buildComponents } from './renderer-config';
import { Lightbox } from '@/components/ui/Lightbox';
import { LazyImage } from '@/components/ui/LazyImage';
import type { MarkdownRendererProps, WikiLinkMap } from './types';

/** [[标题]] 预处理正则 */
const WIKI_LINK_RE = /\[\[([^\[\]]+?)\]\]/g;

/**
 * 在客户端将 [[标题]] 转换为 Markdown 链接
 * 复用服务端构建的 wikiLinkMap 进行标题解析
 */
function preprocessWikiLinks(content: string, map?: WikiLinkMap): string {
  if (!map) return content;
  return content.replace(WIKI_LINK_RE, (_match, rawTitle: string) => {
    const title = rawTitle.trim();
    const key = title.toLowerCase();
    const resolved = map[key];
    if (resolved) {
      return `[${resolved.title}](${resolved.url})`;
    }
    return `[[${title}]]`;
  });
}

interface LightboxState {
  open: boolean;
  images: string[];
  index: number;
}

export function MarkdownRenderer({ content, highlight, wikiLinkMap }: MarkdownRendererProps) {
  const { cfg, highlighter } = useMarkdownConfig(highlight);
  const [lightbox, setLightbox] = useState<LightboxState>({
    open: false,
    images: [],
    index: 0,
  });

  // 每次渲染时重置，img 组件按顺序 push 构建完整数组
  const imagesRef = useRef<string[]>([]);

  const components = useMemo(() => buildComponents(cfg, highlighter), [cfg, highlighter]);

  // 预处理 wiki-link：[[标题]] → [标题](url)
  const processedContent = useMemo(
    () => preprocessWikiLinks(content, wikiLinkMap),
    [content, wikiLinkMap],
  );

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
          // 快照而非引用，防止后续 ref 重置影响 lightbox 图片列表
          setLightbox({ open: true, images: [...imagesRef.current], index });
        }}
      >
        <LazyImage src={src} alt={alt} />
      </div>
    );
  };

  // 每次渲染前重置 ref
  imagesRef.current = [];

  return (
    <div className="markdown-content prose prose-zinc dark:prose-invert max-w-none overflow-x-auto
      prose-headings:tracking-tight
      prose-h1:text-4xl prose-h1:font-black prose-h1:mb-8 prose-h1:mt-16
      prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-14 prose-h2:pb-3 prose-h2:border-b prose-h2:border-zinc-100 dark:prose-h2:border-zinc-700
      prose-h3:text-xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10
      prose-h4:text-lg prose-h4:font-bold prose-h4:mb-3 prose-h4:mt-8
      prose-h5:text-base prose-h5:font-bold prose-h5:mb-2 prose-h5:mt-6
      prose-h6:text-sm prose-h6:font-bold prose-h6:mb-2 prose-h6:mt-6 prose-h6:text-zinc-500
      prose-p:leading-[1.7] prose-p:text-[15px]
      prose-a:font-semibold prose-a:underline prose-a:decoration-zinc-300 dark:prose-a:decoration-zinc-600 prose-a:underline-offset-2 hover:prose-a:decoration-zinc-900 dark:hover:prose-a:decoration-zinc-300
      prose-strong:font-bold
      prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.875em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
      prose-blockquote:border-zinc-900 dark:prose-blockquote:border-zinc-400 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800 prose-blockquote:rounded-r-2xl prose-blockquote:py-1 prose-blockquote:not-italic
      prose-li:text-[15px]
      prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100 dark:prose-img:border-zinc-700
      prose-hr:border-zinc-100 dark:prose-hr:border-zinc-700 prose-hr:my-12
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...components, img: imgComponent as never }}>
        {processedContent}
      </ReactMarkdown>
      <Lightbox
        images={lightbox.images}
        initialIndex={lightbox.index}
        isOpen={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
