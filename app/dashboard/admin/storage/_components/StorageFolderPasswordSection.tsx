/**
 * 文件夹密码设置子组件
 *
 * - 仅在文件夹为私有时由 Popover 嵌入使用
 * - 输入新密码后点击「设置密码」触发 onSetPassword
 * - 已设密码时显示「清除密码」按钮,带 Popconfirm 二次确认
 * - 操作成功后由父组件负责清空 input,本组件不做导航
 */
'use client';

import { useState } from 'react';
import { Popconfirm } from 'antd';
import { Lock, LockOpen } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Props {
  hasPassword: boolean;
  passwordLabel: string;
  passwordHint: string;
  passwordPlaceholder: string;
  hasPasswordLabel: string;
  noPasswordLabel: string;
  setPasswordLabel: string;
  clearPasswordLabel: string;
  confirmClearTitle: string;
  okLabel: string;
  cancelLabel: string;
  disabled?: boolean;
  /** 返回 true 表示成功(用于决定是否清空输入框) */
  onSetPassword: (password: string) => Promise<boolean>;
  onClearPassword: () => Promise<boolean>;
}

export function StorageFolderPasswordSection({
  hasPassword,
  passwordLabel,
  passwordHint,
  passwordPlaceholder,
  hasPasswordLabel,
  noPasswordLabel,
  setPasswordLabel,
  clearPasswordLabel,
  confirmClearTitle,
  okLabel,
  cancelLabel,
  disabled = false,
  onSetPassword,
  onClearPassword,
}: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = password.trim();
  const canSubmit = !disabled && !submitting && trimmed.length > 0;

  const handleSet = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ok = await onSetPassword(trimmed);
      if (ok) setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (disabled || submitting) return;
    setSubmitting(true);
    try {
      await onClearPassword();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-3 mt-2 border-t border-zinc-100 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
          {hasPassword ? <Lock size={12} /> : <LockOpen size={12} />}
          {passwordLabel}
        </div>
        <span
          className={
            hasPassword
              ? 'text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-medium'
              : 'text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 font-medium'
          }
        >
          {hasPassword ? hasPasswordLabel : noPasswordLabel}
        </span>
      </div>

      <p className="text-xs text-zinc-400 px-1 leading-relaxed">{passwordHint}</p>

      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={passwordPlaceholder}
        disabled={disabled || submitting}
        autoComplete="new-password"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSubmit) {
            e.preventDefault();
            void handleSet();
          }
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleSet()}
          disabled={!canSubmit}
        >
          {setPasswordLabel}
        </Button>
        {hasPassword && (
          <Popconfirm
            title={confirmClearTitle}
            okText={okLabel}
            cancelText={cancelLabel}
            okButtonProps={{ danger: true, disabled: disabled || submitting }}
            cancelButtonProps={{ disabled: disabled || submitting }}
            onConfirm={() => void handleClear()}
            disabled={disabled || submitting}
            placement="bottomLeft"
          >
            <Button variant="danger" size="sm" disabled={disabled || submitting}>
              {clearPasswordLabel}
            </Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}

export default StorageFolderPasswordSection;
