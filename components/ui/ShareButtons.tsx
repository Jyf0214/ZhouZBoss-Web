'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, Share2, Globe, MessageCircle, Check } from 'lucide-react';

export interface ShareButtonsProps {
  /** 文章标题 */
  title: string;
  /** 分享 URL */
  url: string;
  /** 分享配置 */
  config: {
    enable: boolean;
    sites?: string[];
  };
  /** 语言偏好（预留） */
  locale?: string;
}

interface PlatformDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  shareUrl: string;
}

function buildPlatforms(title: string, url: string): Record<string, PlatformDef> {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return {
    twitter: {
      id: 'twitter',
      name: 'Twitter',
      icon: <Share2 size={16} />,
      shareUrl: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    weibo: {
      id: 'weibo',
      name: '微博',
      icon: <Globe size={16} />,
      shareUrl: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    },
    qq: {
      id: 'qq',
      name: 'QQ',
      icon: <Globe size={16} />,
      shareUrl: `https://connect.qq.com/widget/shareqq/index.html?title=${encodedTitle}&url=${encodedUrl}`,
    },
    wechat: {
      id: 'wechat',
      name: '微信',
      icon: <MessageCircle size={16} />,
      shareUrl: '',
    },
  };
}

const SHARE_WINDOW_FEATURES = 'noopener,noreferrer,width=600,height=500';

export default function ShareButtons({ title, url, config, locale: _locale }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [wechatHintOpen, setWechatHintOpen] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);
  const [wechatFailed, setWechatFailed] = useState(false);
  const wechatBtnRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wechatCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wechatFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (wechatCopiedTimerRef.current) clearTimeout(wechatCopiedTimerRef.current);
      if (copyFailedTimerRef.current) clearTimeout(copyFailedTimerRef.current);
      if (wechatFailedTimerRef.current) clearTimeout(wechatFailedTimerRef.current);
    };
  }, []);

  // 关闭微信提示浮层（点击外部时）
  useEffect(() => {
    if (!wechatHintOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wechatBtnRef.current && !wechatBtnRef.current.contains(e.target as Node)) {
        setWechatHintOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wechatHintOpen]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      if (copyFailedTimerRef.current) clearTimeout(copyFailedTimerRef.current);
      copyFailedTimerRef.current = setTimeout(() => setCopyFailed(false), 2000);
    }
  }, [url]);

  const handleShare = useCallback((shareUrl: string) => {
    window.open(shareUrl, '_blank', SHARE_WINDOW_FEATURES);
  }, []);

  const handleWechatCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setWechatCopied(true);
      if (wechatCopiedTimerRef.current) clearTimeout(wechatCopiedTimerRef.current);
      wechatCopiedTimerRef.current = setTimeout(() => setWechatCopied(false), 2000);
    } catch {
      setWechatFailed(true);
      if (wechatFailedTimerRef.current) clearTimeout(wechatFailedTimerRef.current);
      wechatFailedTimerRef.current = setTimeout(() => setWechatFailed(false), 2000);
    }
  }, [url]);

  if (!config.enable) return null;

  const sites = config.sites ?? ['twitter', 'weibo', 'qq', 'wechat'];
  const platforms = buildPlatforms(title, url);
  const visiblePlatforms = sites
    .map((s) => platforms[s])
    .filter((p): p is PlatformDef => p !== undefined);

  const btnBaseClass =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-sm text-zinc-600';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 复制链接 */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={`${btnBaseClass} ${
          copied
            ? '!border-green-300 !bg-green-50 !text-green-600'
            : ''
        }`}
        title="复制链接"
      >
        {copied ? <Check size={16} /> : <Link size={16} />}
        {copyFailed ? <span className="text-red-500">复制失败</span> : '复制链接'}
      </button>

      {/* 平台分享按钮 */}
      {visiblePlatforms.map((platform) => {
        if (platform.id === 'wechat') {
          return (
            <div key={platform.id} ref={wechatBtnRef} className="relative">
              <button
                type="button"
                onClick={() => setWechatHintOpen((prev) => !prev)}
                className={btnBaseClass}
                title={platform.name}
              >
                {platform.icon}
                {platform.name}
              </button>

              {/* 微信提示浮层 */}
              {wechatHintOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20">
                  <div className="bg-zinc-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg whitespace-nowrap">
                    <p className="mb-2">复制链接到微信分享</p>
                    <button
                      type="button"
                      onClick={handleWechatCopy}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                        wechatCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                      }`}
                    >
                      {wechatCopied ? <Check size={12} /> : <Link size={12} />}
                      {wechatFailed ? '复制失败' : wechatCopied ? '已复制' : '复制链接'}
                    </button>
                  </div>
                  {/* 小三角箭头 */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-zinc-900" />
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => handleShare(platform.shareUrl)}
            className={btnBaseClass}
            title={platform.name}
          >
            {platform.icon}
            {platform.name}
          </button>
        );
      })}
    </div>
  );
}
