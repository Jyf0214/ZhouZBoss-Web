'use client';

import type { User } from '@/hooks/use-auth';

/** 仪表盘欢迎语区域(用户名 + 控制台描述) */
export function DashboardHeader({ user, t }: { user: User | null; t: (key: string) => string }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">
          {t('dashboard.welcomeBack')}{user?.name ? `，${user.name}` : ''}
        </h1>
      </div>
      <p className="text-zinc-400 text-base">
        {t('dashboard.contentConsole')}
      </p>
    </div>
  );
}
