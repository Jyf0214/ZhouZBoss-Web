'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Tag, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Spin } from 'antd';

interface Ticket {
  slug: string;
  title: string;
  author: string;
  date: string;
  labels: string[];
  status: string;
  template: string;
}

export default function TicketsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchTickets();
  }, [user, router]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) { const data = await res.json(); setTickets(data); }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);

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

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">工单列表</h1>
          <p className="text-sm text-zinc-400 mt-1">查看和管理工单</p>
        </div>
        <Button type="primary" onClick={() => router.push('/tickets/new')} className="bg-zinc-900 rounded-xl">
          创建工单
        </Button>
      </div>

      {/* 状态筛选 */}
      <div className="mb-4 flex gap-2">
        {['all', 'open', 'in-progress', 'closed'].map(status => (
          <Button key={status} size="small" type={statusFilter === status ? 'primary' : 'default'} onClick={() => setStatusFilter(status)} className="rounded-lg">
            {status === 'all' ? '全部' : getStatusText(status)}
          </Button>
        ))}
      </div>

      {/* 工单列表 */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {filteredTickets.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.slug}
                onClick={() => router.push(`/tickets${ticket.slug}`)}
                className="px-6 py-4 cursor-pointer hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(ticket.status)}
                      <span className="font-medium text-sm text-zinc-900">{ticket.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {ticket.template} · {ticket.author} · {new Date(ticket.date).toLocaleDateString('zh-CN')}
                    </p>
                    {ticket.labels.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {ticket.labels.map(label => (
                          <Tag key={label} className="text-xs">{label}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 ml-4">{getStatusText(ticket.status)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <span className="text-zinc-400">暂无工单</span>
          </div>
        )}
      </div>
    </div>
  );
}
