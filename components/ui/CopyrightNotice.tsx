'use client';

import Link from 'next/link';
import { cn } from '@/lib/ui';

export interface CopyrightNoticeProps {
  author: string;
  title: string;
  slug: string;
  type?: 'original' | 'reprint';
  config: {
    enable: boolean;
    license: string;
    licenseUrl: string;
    authorLink: string;
    authorImgFront?: string;
    location?: string;
    decode?: boolean;
  };
  locale?: string;
}

function decodeHtml(text: string): string {
  if (typeof document === 'undefined') return text;
  const el = document.createElement('div');
  el.textContent = text;
  return el.textContent ?? text;
}

export function CopyrightNotice({
  author,
  title,
  slug: _slug,
  type = 'original',
  config,
  locale,
}: CopyrightNoticeProps) {
  if (!config.enable) return null;

  const displayAuthor = config.decode ? decodeHtml(author) : author;
  const displayTitle = config.decode ? decodeHtml(title) : title;

  return (
    <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6">
      {/* 作者信息行 */}
      <div className="flex items-center gap-3 mb-4">
        {config.authorImgFront ? (
          <img
            src={config.authorImgFront}
            alt={displayAuthor}
            className="rounded-full w-10 h-10 object-cover"
          />
        ) : (
          <div className="rounded-full w-10 h-10 bg-zinc-200 flex items-center justify-center text-zinc-500 font-medium text-sm shrink-0">
            {displayAuthor.charAt(0)}
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={config.authorLink}
            className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors truncate"
          >
            {displayAuthor}
          </Link>
          {config.location && (
            <span className="text-xs text-zinc-400 shrink-0">{config.location}</span>
          )}
        </div>
      </div>

      {/* 文章标题 + 原创/转载标识 */}
      <div className="flex items-start gap-2 mb-3">
        <h4 className="text-sm font-medium text-zinc-800 leading-relaxed flex-1 min-w-0">
          {displayTitle}
        </h4>
        <span
          className={cn(
            'inline-flex items-center shrink-0 px-2 py-0.5 rounded-md text-xs font-medium',
            type === 'original'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700',
          )}
        >
          {type === 'original' ? '原创' : '转载'}
        </span>
      </div>

      {/* 许可证信息 */}
      {config.license && (
        <div className="mb-3">
          <a
            href={config.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors underline underline-offset-2 decoration-zinc-300"
          >
            {config.license}
          </a>
        </div>
      )}

      {/* 版权声明文本 */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {locale === 'en' ? (
          <>
            Published by{' '}
            <a
              href={config.authorLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-700 underline underline-offset-2 decoration-zinc-300 transition-colors"
            >
              {displayAuthor}
            </a>
            . Licensed under{' '}
            <a
              href={config.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-700 underline underline-offset-2 decoration-zinc-300 transition-colors"
            >
              {config.license}
            </a>
            . All rights reserved.
          </>
        ) : (
          <>
            本文由{' '}
            <a
              href={config.authorLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-700 underline underline-offset-2 decoration-zinc-300 transition-colors"
            >
              {displayAuthor}
            </a>
            {' '}发布，采用{' '}
            <a
              href={config.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-700 underline underline-offset-2 decoration-zinc-300 transition-colors"
            >
              {config.license}
            </a>
            {type === 'original'
              ? ' 许可协议。版权归作者所有，未经授权禁止转载。'
              : '，版权归原作者所有。'}
          </>
        )}
      </p>
    </div>
  );
}
