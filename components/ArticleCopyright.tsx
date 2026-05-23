'use client';

import { useConfig } from '@/hooks/use-config';

interface ArticleCopyrightProps {
  authorName: string;
  authorUrl?: string;
}

export default function ArticleCopyright({ authorName, authorUrl }: ArticleCopyrightProps) {
  const { config } = useConfig();
  const cfg = config?.copyright;

  if (!cfg?.enable) return null;

  const decodedName = cfg.decode ? decodeURIComponent(authorName) : authorName;

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100">
      <div className="bg-zinc-50 rounded-2xl p-6 space-y-3 text-sm text-zinc-500">
        <div className="flex items-center gap-3">
          {cfg.authorImgFront && (
            <img src={cfg.authorImgFront} alt="" className={`w-8 h-8 ${cfg.avatarSinks ? 'rounded-full' : 'rounded-xl'} object-cover`} />
          )}
          <span className="font-bold text-zinc-700">本文作者</span>
          {cfg.authorImgBack && (
            <img src={cfg.authorImgBack} alt="" className={`w-8 h-8 ${cfg.avatarSinks ? 'rounded-full' : 'rounded-xl'} object-cover`} />
          )}
        </div>
        <div className="space-y-1">
          <p>
            <span className="text-zinc-400">作者: </span>
            <a
              href={cfg.authorHref ?? cfg.authorLink ?? authorUrl ?? '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 font-medium hover:text-zinc-900 underline underline-offset-2 decoration-zinc-300"
            >
              {decodedName}
            </a>
          </p>
          {cfg.location && (
            <p>
              <span className="text-zinc-400">来源: </span>
              <span>{cfg.location}</span>
            </p>
          )}
          {cfg.license && (
            <p>
              <span className="text-zinc-400">许可: </span>
              {cfg.licenseUrl ? (
                <a
                  href={cfg.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-700 hover:text-zinc-900 underline underline-offset-2 decoration-zinc-300"
                >
                  {cfg.license}
                </a>
              ) : (
                <span>{cfg.license}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
