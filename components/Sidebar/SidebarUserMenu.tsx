import { LogOut } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/Button';
import type { SidebarUser } from './types';

interface SidebarUserMenuProps {
  user?: SidebarUser;
  onLogout: () => void;
  collapsed?: boolean;
}

export default function SidebarUserMenu({ user, onLogout, collapsed }: SidebarUserMenuProps) {
  const { t } = useI18n();

  if (collapsed) {
    return (
      <div className="p-3 flex justify-center border-b border-zinc-100">
        <Avatar name={user?.name ?? 'U'} avatarUrl={user?.avatar} size={36} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-zinc-700 border border-zinc-100 dark:border-zinc-600 shadow-sm group">
        <Avatar name={user?.name ?? 'U'} avatarUrl={user?.avatar} size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {user?.name ?? '用户'}
          </div>
          <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-tighter">
            {user?.role === 'sudo'
              ? t('user.sudo')
              : user?.role === 'admin'
                ? t('user.admin')
                : t('user.user')}
          </div>
        </div>
        <Button
          onClick={onLogout}
          variant="ghost"
          size="sm"
          iconOnly
          icon={<LogOut size={18} />}
          title={t('auth.logout')}
          aria-label={t('auth.logout')}
        />
      </div>
    </div>
  );
}
