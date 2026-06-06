// FooterCopyright - 底栏：版权信息 + 协议链接 + 品牌文字（打字机 + 自定义文案）
// 包含私有的 TypedText 打字机效果组件。

'use client';

import React, { useEffect, useRef, useState } from 'react';

// ─── Typed Text（私有辅助组件） ──────────────────────

interface TypedTextProps {
  prefix?: string;
  texts: string[];
}

/**
 * 打字机效果：逐字显示 / 删除，并在 texts 之间循环。
 */
function TypedText({ prefix, texts }: TypedTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!texts.length) return;
    const currentText = texts[textIndex];
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentText.length) {
            setDisplayed(currentText.slice(0, charIndex + 1));
            setCharIndex((prev) => prev + 1);
          } else {
            // 完整显示后停顿 2 秒开始删除
            const pause = setTimeout(() => setIsDeleting(true), 2000);
            currentPauseRef.current = pause;
          }
        } else {
          if (charIndex > 0) {
            setDisplayed(currentText.slice(0, charIndex - 1));
            setCharIndex((prev) => prev - 1);
          } else {
            setIsDeleting(false);
            setTextIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? 50 : 100,
    );

    return () => {
      clearTimeout(timeout);
      if (currentPauseRef.current) {
        clearTimeout(currentPauseRef.current);
        currentPauseRef.current = null;
      }
    };
  }, [charIndex, isDeleting, textIndex, texts]);

  if (!texts.length) return null;

  return (
    <span>
      {prefix && <span>{prefix}</span>}
      <span className="text-zinc-900 font-medium">{displayed}</span>
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ─── FooterBar（导出的版权底栏） ────────────────────

export interface FooterBarProps {
  owner: { enable: boolean; since: number; author?: string };
  author: string;
  customText: string;
  typedTextPrefix?: string;
  typedText?: string[];
}

/**
 * 页脚底栏：左侧 © 年份 + 协议链接，右侧打字机文案 + 自定义文字。
 */
export function FooterBar({
  owner,
  author,
  customText,
  typedTextPrefix,
  typedText,
}: FooterBarProps) {
  const year = new Date().getFullYear();

  return (
    <div className="border-t border-zinc-100 bg-zinc-50">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* 左侧：版权 + 协议 */}
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          {owner.enable && (
            <span>
              &copy; {owner.since}&mdash;{year} {author}
            </span>
          )}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 transition-colors duration-300 text-xs"
            title="CC BY-NC-SA 4.0"
          >
            CC BY-NC-SA 4.0
          </a>
        </div>

        {/* 右侧：打字机 + 自定义文字 */}
        <div className="text-sm text-zinc-400 flex items-center gap-4">
          {typedText && typedText.length > 0 && (
            <TypedText prefix={typedTextPrefix} texts={typedText} />
          )}
          {customText && <span>{customText}</span>}
        </div>
      </div>
    </div>
  );
}

export default FooterBar;
