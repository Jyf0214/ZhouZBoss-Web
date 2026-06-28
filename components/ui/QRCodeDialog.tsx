'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from 'antd';
import { Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

export interface QRCodeDialogProps {
  /** 弹窗是否可见 */
  open: boolean;
  /** 二维码指向的 URL */
  url: string;
  /** 文章标题 */
  title?: string;
  /** 关闭回调 */
  onClose: () => void;
}

export default function QRCodeDialog({ open, url, title, onClose }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const { t } = useI18n();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (failedTimerRef.current) clearTimeout(failedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      if (failedTimerRef.current) clearTimeout(failedTimerRef.current);
      failedTimerRef.current = setTimeout(() => setCopyFailed(false), 2000);
    }
  }, [url]);

  const encodedUrl = encodeURIComponent(url);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(420px, 90vw)"
      className="qr-code-dialog"
      title={
        <span className="flex items-center gap-2 text-base">
          <QrCode size={18} />
          {t('posts.shareQR')}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-5 pt-2 pb-2">
        {/* 二维码图片 */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <img
            src={qrSrc}
            alt={title ? `${title} 的二维码` : t('posts.shareQR')}
            className="w-[200px] h-[200px] block"
            loading="lazy"
          />
        </div>

        {/* 文章标题 */}
        {title && (
          <p className="text-sm font-semibold text-zinc-800 text-center line-clamp-2 w-full">
            {title}
          </p>
        )}

        {/* URL 输入框 + 复制按钮 */}
        <div className="flex items-stretch w-full">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 min-w-0 px-3 py-2 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-l-lg outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 text-sm font-medium border transition-colors whitespace-nowrap rounded-r-lg ${
              copied
                ? 'bg-green-50 border-green-300 text-green-600'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copyFailed ? '失败' : copied ? '已复制' : '复制'}
          </button>
        </div>

        {/* 在新窗口打开 */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          <ExternalLink size={14} />
          在新窗口打开
        </a>
      </div>
    </Modal>
  );
}
