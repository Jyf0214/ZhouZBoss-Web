'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Trash2, Edit2, Check, X, User } from 'lucide-react';

export default function UsersPage() {
  const { userRole } = useAuth();
  const [users] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  const hasAccess = userRole === 'sudo' || userRole === 'admin';

  useEffect(() => {
    if (!hasAccess) return;
    // TODO: 实现获取用户列表的 API 调用
  }, [hasAccess]);

  const handleUpdateRole = async (id: string) => {
    console.log('Update user role:', id, editRole);
    // TODO: 实现更新用户角色逻辑
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    console.log('Delete user:', id);
    // TODO: 实现删除用户逻辑
  };

  if (!hasAccess) {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Only Sudo/Admin can access this page.</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-zinc-900 mb-8">Manage Users</h1>
      
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                        <User size={16} />
                      </div>
                      <span className="font-medium text-zinc-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-600">{u.email}</td>
                  <td className="p-4">
                    {editingId === u.id ? (
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="lobe-input py-1 text-sm w-32 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 outline-none"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                        <option value="sudo">超级管理员</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'sudo' || u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        'bg-zinc-100 text-zinc-800'
                      }`}>
                        {u.role === 'sudo' ? '超级管理员' : u.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === u.id ? (
                        <>
                          <button onClick={() => handleUpdateRole(u.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-md">
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setEditingId(u.id); setEditRole(u.role); }}
                            className="p-2 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500 font-medium">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
