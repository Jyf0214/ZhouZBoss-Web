'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Save } from 'lucide-react';
import { Button, Spin } from 'antd';

interface Ticket {
  slug: string;
  title: string;
  author: string;
  date: string;
  labels: string[];
  status: string;
  template: string;
  content: string;
}

export default function TicketDetailPage({ params }: { params: { slug: string[] } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const slug = '/' + (params.slug?.join('/') || '');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchTicket();
  }, [user, router, slug]);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${slug}`, { headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
        setNewStatus(data.status || 'open');
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!ticket || newStatus === ticket.status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTicket({ ...ticket, status: newStatus });
        alert('状态更新成功');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={16} style={{ color: '#faad14' }} />;
      case 'in-progress': return <Clock size={16} style={{ color: '#1890ff' }} />;
      case 'closed': return <CheckCircle2 size={16} style={{ color: '#52c41a' }} />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '待处理';
      case 'in-progress': return '处理中';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'sudo';

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-zinc-400">工单不存在或无权限访问</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button size="small" icon={<ArrowLeft size={14} />} onClick={() => router.push('/tickets')} className="rounded-lg" />
        <h1 className="text-2xl font-bold text-zinc-900">工单详情</h1>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        {/* 标题和状态 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(ticket.status)}
            <span className="text-xl font-semibold text-zinc-900">{ticket.title}</span>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: ticket.status === 'open' ? '#fff7e6' : ticket.status === 'closed' ? '#f6ffed' : '#e6f7ff',
              color: ticket.status === 'open' ? '#fa8c16' : ticket.status === 'closed' ? '#52c41a' : '#1890ff',
            }}
          >
            {getStatusText(ticket.status)}
          </span>
        </div>

        {/* 元信息 */}
        <div className="mb-5 p-4 bg-zinc-50 rounded-xl">
          <p className="text-xs text-zinc-400">
            作者: {ticket.author} · 创建时间: {new Date(ticket.date).toLocaleString('zh-CN')} · 模板: {ticket.template}
          </p>
          {ticket.labels.length > 0 && (
            <div className="mt-2 flex gap-1">
              {ticket.labels.map(label => (
                <span key={label} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">{label}</span>
              ))}
            </div>
          )}
        </div>

        {/* 工单内容 */}
        <div className="p-4 bg-zinc-50 rounded-xl min-h-[200px] whitespace-pre-wrap leading-relaxed text-sm text-zinc-700">
          {ticket.content}
        </div>

        {/* 状态更新（仅管理员） */}
        {isAdmin && (
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-700">更新状态:</span>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="h-9 px-3 border border-zinc-200 rounded-lg text-sm"
              >
                <option value="open">待处理</option>
                <option value="in-progress">处理中</option>
                <option value="closed">已关闭</option>
              </select>
              <Button
                type="primary"
                icon={<Save size={14} />}
                onClick={handleStatusChange}
                loading={saving}
                disabled={newStatus === ticket.status}
                className="bg-zinc-900 rounded-xl"
              >
                保存
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
