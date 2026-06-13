'use client';

/**
 * 新建页面弹窗组件
 *
 * 输入名称 + 公开/私有切换，调用 POST /api/page/create 完成创建。
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CreatePageDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const NAME_PATTERN = /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/;

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '请输入页面名称';
  if (trimmed.length > 100) return '名称不能超过 100 个字符';
  if (!NAME_PATTERN.test(trimmed)) return '仅支持字母、数字、中文、连字符、下划线';
  return null;
}

/* ---------- 子组件 ---------- */

function DialogHeader({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 className="text-base font-semibold text-zinc-900">新建页面</h2>
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

function VisibilityToggle({ isPublic, onToggle, disabled }: { isPublic: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-zinc-50 rounded-xl">
      <div>
        <div className="text-sm font-medium text-zinc-900">{isPublic ? '公开' : '私有'}</div>
        <div className="text-xs text-zinc-400">{isPublic ? '所有人可访问' : '仅自己可访问'}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-50',
          isPublic ? 'bg-zinc-900' : 'bg-zinc-300',
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5',
          isPublic ? 'translate-x-5.5' : 'translate-x-0.5',
        )} />
      </button>
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

function DialogFooter({ onClose, onSubmit, canSubmit, submitting }: {
  onClose: () => void; onSubmit: () => void; canSubmit: boolean; submitting: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 bg-zinc-50 border-t border-zinc-100 rounded-b-2xl">
      <Button variant="default" size="sm" onClick={onClose} disabled={submitting} autoLoading={false}>
        取消
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSubmit}
        loading={submitting}
        disabled={!canSubmit}
        icon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
      >
        {submitting ? '创建中...' : '创建'}
      </Button>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export function CreatePageDialog({ open, onClose, onCreated }: CreatePageDialogProps) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setIsPublic(true);
      setSubmitting(false);
      setErrorMsg(null);
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

  const handleCreate = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/page/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), template: 'blank', isPublic }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onCreated();
        onClose();
      } else {
        setErrorMsg(data.error ?? '创建失败，请重试');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络错误');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, name, isPublic, onCreated, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !submitting) onClose();
    if (e.key === 'Enter' && canSubmit) void handleCreate();
  }, [submitting, onClose, canSubmit, handleCreate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl ring-1 ring-zinc-200">
        <DialogHeader onClose={onClose} disabled={submitting} />

        <div className="px-5 pb-4 space-y-4">
          <Input
            ref={inputRef}
            label="页面名称"
            placeholder="例如: my-page"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            error={nameError ?? duplicateError ?? undefined}
            size="sm"
            disabled={submitting}
          />
          <p className="text-xs text-zinc-400 -mt-2">
            仅字母、数字、中文、连字符、下划线
          </p>

          <VisibilityToggle isPublic={isPublic} onToggle={() => setIsPublic(!isPublic)} disabled={submitting} />

          {errorMsg && <ErrorBanner message={errorMsg} />}
        </div>

        <DialogFooter onClose={onClose} onSubmit={() => void handleCreate()} canSubmit={canSubmit} submitting={submitting} />
      </div>
    </div>
  );
}

export default CreatePageDialog;
