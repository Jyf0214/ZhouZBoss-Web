'use client';

import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';
import { Dropdown, type MenuProps } from 'antd';
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { user, userRole, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const isSudo = userRole === 'sudo' || userRole === 'admin';
  const userUid = user?.uid ?? '';
  const displayName = user?.name ?? user?.displayName ?? 'User';
  const avatarUrl = user?.avatar;

  const handleLogout = () => {
    void logout();
  };

  const items: MenuProps['items'] = [
    {
      key: 'settings',
      label: t('nav.settings'),
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: t('nav.logout'),
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'settings') {
      router.push('/dashboard/settings');
    } else if (key === 'logout') {
      handleLogout();
    }
  };

  return (
    <div>
      <Dropdown
        menu={{ items, onClick: handleMenuClick }}
        trigger={['click']}
        placement="bottomRight"
        arrow
      >
        <Button variant="ghost" autoLoading={false} className="flex items-center gap-2">
          <Avatar name={displayName} avatarUrl={avatarUrl} size={36} />
          <div className="hidden md:block">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-zinc-900 leading-tight">{displayName}</span>
              {isSudo && (
                <span className="text-xs text-amber-600 font-medium" style={{ borderRadius: 6 }}>
                  {t('user.sudo')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400 font-mono leading-tight">{userUid}</span>
            </div>
          </div>
        </Button>
      </Dropdown>
    </div>
  );
}
