'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Trash2, Edit2, Check, X, User } from 'lucide-react';
import { Icon, Text } from '@lobehub/ui';

export default function UsersPage() {
  const { userRole } = useAuth();
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
      // TODO: 实现更新用户角色逻辑
      console.log('更新用户角色:', id, editRole);
      setEditingId(null);
    } catch (error) {
      console.error('更新角色失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    // 检查是否是首个管理员用户
    const targetUser = users.find(u => u.uid === id);
    if (targetUser?.role === 'sudo') {
      alert(locale === 'zh-CN' ? '不能删除首个管理员用户' : 'Cannot delete the first admin user');
      return;
    }
    
    if (!confirm(locale === 'zh-CN' ? '确定要删除此用户吗？' : 'Are you sure you want to delete this user?')) return;
    try {
      // TODO: 实现删除用户逻辑
      console.log(locale === 'zh-CN' ? '删除用户' : 'Delete user:', id);
    } catch (error) {
      console.error(locale === 'zh-CN' ? '删除用户失败' : 'Delete user failed:', error);
    }
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text style={{ color: 'var(--ant-color-error)' }}>无权限访问，仅管理员可访问此页面</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Text fontSize={24} weight={'bold'} style={{ marginBottom: 24, display: 'block' }}>
        用户管理
      </Text>
      
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              background: '#fafafa',
              borderBottom: '1px solid #e5e5e5',
            }}>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>用户</th>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>邮箱</th>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>角色</th>
              <th style={{ padding: 16, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid || u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      background: '#f5f5f5',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon icon={User} style={{ fontSize: 16, color: '#999' }} />
                    </div>
                    <Text weight={500}>{u.name || u.username || '未设置'}</Text>
                  </div>
                </td>
                <td style={{ padding: 16 }}>
                  <Text type="secondary">{u.email}</Text>
                </td>
                <td style={{ padding: 16 }}>
                  {editingId === u.uid ? (
                    <select 
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #d9d9d9',
                        fontSize: 13,
                      }}
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                      {u.role !== 'sudo' && <option value="sudo">超级管理员</option>}
                    </select>
                  ) : (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 16,
                      fontSize: 12,
                      background: u.role === 'sudo' || u.role === 'admin' ? '#f0f5ff' : '#f5f5f5',
                      color: u.role === 'sudo' || u.role === 'admin' ? '#1890ff' : '#666',
                    }}>
                      {u.role === 'sudo' ? '超级管理员' : u.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  )}
                </td>
                <td style={{ padding: 16, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {editingId === u.uid ? (
                      <>
                        <button 
                          onClick={() => handleUpdateRole(u.uid)}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#52c41a',
                          }}
                        >
                          <Icon icon={Check} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#999',
                          }}
                        >
                          <Icon icon={X} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setEditingId(u.uid); setEditRole(u.role); }}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#1890ff',
                          }}
                          title="编辑"
                        >
                          <Icon icon={Edit2} />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.uid)}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#ff4d4f',
                          }}
                          title="删除"
                        >
                          <Icon icon={Trash2} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center' }}>
                  <Text type="secondary">暂无用户</Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
