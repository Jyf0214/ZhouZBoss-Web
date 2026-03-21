'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllUserGroups } from '@/lib/user';
import { Tag } from 'antd';

interface UserGroupBadgeProps {
  userGroupId?: string;
}

/**
 * User Group Badge Component
 * Shows user's group membership
 */
export function UserGroupBadge({ userGroupId }: UserGroupBadgeProps) {
  const { isSudo } = useAuth();
  const [groupName, setGroupName] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (userGroupId) {
      getAllUserGroups().then(groups => {
        const group = groups.find(g => g.id === userGroupId);
        if (group) {
          setGroupName(group.name);
        }
      });
    }
  }, [userGroupId]);

  if (!userGroupId || !groupName) return null;

  return (
    <Tag color={isSudo ? 'gold' : 'blue'}>
      {groupName}
    </Tag>
  );
}

/**
 * User Group Notification
 * Shows "当前 {user} 属于 {usergroup}" on login
 */
export function UserGroupNotification() {
  const { user, isSudo } = useAuth();

  if (!user || !user.userGroup) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-zinc-200 p-4 max-w-sm animate-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm text-zinc-600">
            欢迎，<span className="font-medium text-zinc-900">{user.displayName}</span>
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            当前 <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{user.uid}</span> 属于{' '}
            <span className="font-medium text-blue-600">{user.userGroup}</span>
          </p>
        </div>
        {isSudo && (
          <Tag color="gold" className="shrink-0">
            Sudo
          </Tag>
        )}
      </div>
    </div>
  );
}
