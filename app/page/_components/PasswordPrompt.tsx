'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';

/**
 * 私有页面密码输入框
 *
 * - 用户输入密码后提交,通过 POST 请求 /api/page-password 验证并设置 httpOnly cookie
 * - 验证成功后无密码地跳转回原路径,密码不再出现在 URL 中
 * - 支持显示/隐藏密码
 * - wrongPassword=true 时,顶部红条 + 错误提示
 */
export function PasswordPrompt({
  path,
  wrongPassword = false,
}: {
  path: string;
  wrongPassword?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    try {
      const res = await fetch('/api/page-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, password: trimmed }),
      });
      if (res.ok) {
        router.push(`/page/${path}`);
      } else {
        router.push(`/page/${path}?auth=fail`);
      }
    } catch {
      router.push(`/page/${path}?auth=fail`);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-sm ring-1 ring-zinc-200 backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            <Lock size={20} aria-hidden />
          </span>
          <h1 className="text-xl font-semibold text-zinc-900">
            {t('page.passwordRequired')}
          </h1>
        </div>

        {wrongPassword && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {t('page.wrongPassword')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('page.passwordPlaceholder')}
              autoFocus
              required
              minLength={1}
              className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-11 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
              aria-label={t('page.passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              aria-label={showPassword ? t('page.hidePassword') : t('page.showPassword')}
            >
              {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" block disabled={!value.trim()} autoLoading={false}>
            {t('page.passwordSubmit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
