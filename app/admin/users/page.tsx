'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Trash2, Edit2, Check, X, User } from 'lucide-react';
import { Button, Tag, Popconfirm, Spin, Select } from 'antd';

export default function UsersPage() {
  const { userRole } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const hasAccess = userRole === 'sudo' || userRole === 'admin';

  useEffect(() => {
    if (!hasAccess) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('获取用户列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [hasAccess]);

  const handleUpdateRole = async (id: string) => {
    try {
      const targetUser = users.find(u => u.uid === id);
      if (targetUser?.role === 'sudo' && editRole !== 'sudo') {
        alert(t('admin.cannotDemoteFirstAdmin'));
        setEditingId(null);
        return;
      }
      console.log(t('admin.updateRole'), id, editRole);
      setEditingId(null);
    } catch (error) {
      console.error(t('admin.updateRoleFailed'), error);
    }
  };

  const handleDelete = async (id: string) => {
    const targetUser = users.find(u => u.uid === id);
    if (targetUser?.role === 'sudo') {
      alert(t('admin.cannotDeleteFirstAdmin'));
      return;
    }
    try {
      console.log(t('admin.deleteUser'), id);
    } catch (error) {
      console.error(t('admin.deleteUserFailed'), error);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-8 text-center">
        <span className="text-red-500">{t('groups.adminOnly')}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">{t('admin.users')}</h1>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-500 uppercase tracking-wider">
          <div className="col-span-3">{t('common.user')}</div>
          <div className="col-span-4">{t('admin.email')}</div>
          <div className="col-span-3">{t('admin.role')}</div>
          <div className="col-span-2 text-right">{t('admin.actions')}</div>
        </div>

        {users.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {users.map((u) => (
              <div key={u.uid || u.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50/50 transition-colors">
                {/* 用户 */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                    <User size={14} className="text-zinc-400" />
                  </div>
                  <span className="font-medium text-sm text-zinc-900 truncate">{u.name || u.username || t('admin.noRole')}</span>
                </div>

                {/* 邮箱 */}
                <div className="col-span-4 text-sm text-zinc-400 truncate">{u.email}</div>

                {/* 角色 */}
                <div className="col-span-3">
                  {editingId === u.uid ? (
                    <Select
                      value={editRole}
                      onChange={setEditRole}
                      size="small"
                      className="w-28"
                      options={[
                        { label: t('admin.user'), value: 'user' },
                        { label: t('admin.admin'), value: 'admin' },
                        ...(u.role !== 'sudo' ? [{ label: t('admin.superAdmin'), value: 'sudo' }] : []),
                      ]}
                    />
                  ) : (
                    <Tag color={u.role === 'sudo' || u.role === 'admin' ? 'blue' : 'default'} className="rounded-lg text-xs">
                      {u.role === 'sudo' ? t('admin.superAdmin') : u.role === 'admin' ? t('admin.admin') : t('admin.user')}
                    </Tag>
                  )}
                </div>

                {/* 操作 */}
                <div className="col-span-2 flex items-center gap-1 justify-end">
                  {editingId === u.uid ? (
                    <>
                      <Button size="small" type="text" icon={<Check size={14} className="text-emerald-500" />} onClick={() => handleUpdateRole(u.uid)} />
                      <Button size="small" type="text" icon={<X size={14} className="text-zinc-400" />} onClick={() => setEditingId(null)} />
                    </>
                  ) : (
                    <>
                      <Button size="small" type="text" icon={<Edit2 size={14} className="text-blue-500" />} onClick={() => { setEditingId(u.uid); setEditRole(u.role); }} title={t('common.edit')} />
                      <Popconfirm
                        title={t('admin.deleteConfirm')}
                        onConfirm={() => handleDelete(u.uid)}
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" type="text" danger icon={<Trash2 size={14} />} title={t('common.delete')} />
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <span className="text-zinc-400">{t('admin.noUsers')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
