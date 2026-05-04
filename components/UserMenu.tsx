'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button, Dropdown } from 'antd';
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

export function UserMenu() {
  const { user, userRole, logout } = useAuth();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSudo = userRole === 'sudo' || userRole === 'admin';
  const userUid = user?.uid || '';
  const displayName = user?.name || user?.displayName || 'User';
  const avatarUrl = user?.avatar;

  const items: MenuProps['items'] = [
    {
      key: 'settings',
      label: t('nav.settings'),
      icon: <SettingOutlined />,
      onClick: () => {
        setIsOpen(false);
        window.location.href = '/dashboard/settings';
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: t('nav.logout'),
      icon: <LogoutOutlined />,
      onClick: () => {
        setIsOpen(false);
        logout();
      },
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <Dropdown
        menu={{ items }}
        open={isOpen}
        onOpenChange={setIsOpen}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button type="text" className="flex items-center gap-2">
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
