'use client';

/**
 * 页面复制弹窗组件
 *
 * 输入新名称，调用 POST /api/page/copy 完成复制。
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CopyPageDialogProps {
  open: boolean;
  /** 源页面信息 */
  sourcePage: { title: string; folder: string; filename: string } | null;
  onClose: () => void;
  onCopied: () => void;
}

const NAME_PATTERN = /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/;

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '请输入新页面名称';
  if (trimmed.length > 100) return '名称不能超过 100 个字符';
  if (!NAME_PATTERN.test(trimmed)) return '仅支持字母、数字、中文、连字符、下划线';
  return null;
}

/* ---------- 子组件 ---------- */

function DialogHeader({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 className="text-base font-semibold text-zinc-900">复制页面</h2>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-40"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function SourcePageInfo({ sourcePage }: { sourcePage: { title: string; folder: string; filename: string } }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-500">
        <Copy size={14} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-900 truncate">{sourcePage.title}</div>
        <div className="text-xs text-zinc-400 font-mono truncate">
          {sourcePage.folder ? `${sourcePage.folder}/${sourcePage.filename}` : sourcePage.filename}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 ring-1 ring-red-200">
      <p className="text-sm text-red-700 flex-1">{message}</p>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(message)}
        className="text-xs text-red-500 hover:text-red-700 underline shrink-0"
      >
        复制
      </button>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
      <p className="text-sm text-emerald-700 flex-1">{message}</p>
    </div>
  );
}

function DialogFooter({ onClose, onSubmit, canSubmit, submitting, disabled }: {
  onClose: () => void; onSubmit: () => void; canSubmit: boolean; submitting: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 bg-zinc-50 border-t border-zinc-100 rounded-b-2xl">
      <Button variant="default" size="sm" onClick={onClose} disabled={submitting || !!disabled} autoLoading={false}>
        取消
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSubmit}
        loading={submitting}
        disabled={!canSubmit || !!disabled}
        icon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
      >
        {submitting ? '复制中...' : '复制'}
      </Button>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export function CopyPageDialog({ open, sourcePage, onClose, onCopied }: CopyPageDialogProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setSubmitting(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDuplicateError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setDuplicateError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim() && NAME_PATTERN.test(value.trim())) {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/storage/folders');
          if (res.ok) {
            const data = await res.json();
            const folders: { path?: string }[] = data.folders ?? [];
            if (folders.some((f) => f.path === `pages/${value.trim()}`)) {
              setDuplicateError('该名称已存在');
            }
          }
        } catch { /* 网络错误不阻塞 */ }
      }, 500);
    }
  }, []);

  const nameError = name.trim() ? validateName(name) : null;
  const canSubmit = !!name.trim() && !nameError && !duplicateError && !submitting;

  const handleCopy = useCallback(async () => {
    if (!canSubmit || !sourcePage) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/page/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: sourcePage.folder ? `${sourcePage.folder}/${sourcePage.filename.replace(/\.html?$/i, '')}` : sourcePage.filename.replace(/\.html?$/i, ''),
          newName: name.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg(`页面 "${name.trim()}" 创建成功`);
        onCopied();
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMsg(data.error ?? '复制失败，请重试');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络错误');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, sourcePage, name, onCopied, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !submitting && !successMsg) onClose();
    if (e.key === 'Enter' && canSubmit) void handleCopy();
  }, [submitting, successMsg, onClose, canSubmit, handleCopy]);

  if (!open || !sourcePage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={submitting || !!successMsg ? undefined : onClose} />

      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl ring-1 ring-zinc-200">
        <DialogHeader onClose={onClose} disabled={submitting || !!successMsg} />

        <div className="px-5 pb-4 space-y-4">
          <SourcePageInfo sourcePage={sourcePage} />

          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
          </div>

          <Input
            ref={inputRef}
            label="新页面名称"
            placeholder="例如: my-page-copy"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            error={nameError ?? duplicateError ?? undefined}
            size="sm"
            disabled={submitting}
          />
          <p className="text-xs text-zinc-400 -mt-2">
            仅字母、数字、中文、连字符、下划线
          </p>

          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <SuccessBanner message={successMsg} />}
        </div>

        <DialogFooter onClose={onClose} onSubmit={() => void handleCopy()} canSubmit={canSubmit} submitting={submitting} disabled={!!successMsg} />
      </div>
    </div>
  );
}

export default CopyPageDialog;
