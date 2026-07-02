'use client';

/**
 * 自定义 HTML 页面:WebDAV 未配置时的提示 UI
 *
 * 当 .env.local 中缺少 WEBDAV_URL / WEBDAV_USER / WEBDAV_PASS 时,
 * 服务端路由无法读取 HTML 文件,渲染此友好降级页(而非 500/404),
 * 引导运维补齐环境变量。
 */
import { AlertTriangle, FileQuestion } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

export function NotConfiguredView() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle size={22} aria-hidden />
          </span>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {t('page.notConfigured')}
          </h1>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-zinc-600">
          {t('page.notConfiguredDesc')}
        </p>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-4 ring-1 ring-zinc-200 dark:ring-zinc-700">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <FileQuestion size={14} aria-hidden />
            <span>pages/</span>
          </div>
          <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <code className="rounded bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
                pages/index.html
              </code>
            </li>
            <li>
              <code className="rounded bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
                pages/about.html
              </code>
            </li>
            <li>
              <code className="rounded bg-white dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
                pages/blog/post.html
              </code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
