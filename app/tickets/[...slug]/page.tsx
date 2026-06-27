'use client';

import React, { useEffect, useState, use } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Save } from 'lucide-react';
import { message } from 'antd';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';
import { PageContainer } from '@/components/ui/PageContainer';

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

function TicketStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const getStatusText = (s: string) => {
    switch (s) {
      case 'open': return t('tickets.statusOpen');
      case 'in-progress': return t('tickets.statusInProgress');
      case 'closed': return t('tickets.statusClosed');
      default: return s;
    }
  };

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium"
      style={{
        background: status === 'open' ? '#fff7e6' : status === 'closed' ? '#f6ffed' : '#e6f7ff',
        color: status === 'open' ? '#fa8c16' : status === 'closed' ? '#52c41a' : '#1890ff',
      }}
    >
      {getStatusText(status)}
    </span>
  );
}

function TicketStatusUpdater({
  ticket,
  newStatus,
  saving,
  isAdmin,
  onStatusChange,
  onSave,
  t,
}: {
  ticket: Ticket;
  newStatus: string;
  saving: boolean;
  isAdmin: boolean;
  onStatusChange: (status: string) => void;
  onSave: () => void;
  t: (key: string) => string;
}) {
  if (!isAdmin) return null;

  return (
    <div className="mt-6 pt-5 border-t border-zinc-100">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-700">{t('tickets.updateStatus')}:</span>
        <Select
          value={newStatus}
          onChange={e => onStatusChange(e.target.value)}
          size="sm"
        >
          <option value="open">{t('tickets.statusOpen')}</option>
          <option value="in-progress">{t('tickets.statusInProgress')}</option>
          <option value="closed">{t('tickets.statusClosed')}</option>
        </Select>
        <Button
          variant="primary"
          icon={<Save size={14} />}
          onClick={onSave}
          loading={saving}
          disabled={newStatus === ticket.status}
          rounded="md"
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

export default function TicketDetailPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const { t, locale } = useI18n();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const slug = '/' + (resolvedParams.slug?.join('/') ?? '');

  if (!slug || slug === '/') {
    notFound();
  }

  const _fetchTicket = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${slug}`, { headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
        setNewStatus(data.status ?? 'open');
      } else {
        showError(t('tickets.detailLoadFailed'));
      }
    } catch (error) {
		console.error('Failed to fetch ticket:', error);
		showError(t('tickets.detailLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const fetchWithAbort = async () => {
      try {
        const res = await fetch(`/api/tickets/${slug}`, {
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setTicket(data);
          setNewStatus(data.status ?? 'open');
        } else {
          showError(t('tickets.detailLoadFailed'));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to fetch ticket:', error);
        showError(t('tickets.detailLoadFailed'));
      } finally {
        setLoading(false);
      }
    };
    void fetchWithAbort();
    return () => controller.abort();
  }, [user, slug, t]);

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
        message.success(t('common.success'));
      } else {
        showError(t('common.error'));
      }
    } catch (error) {
		console.error('Failed to update status:', error);
		showError(t('tickets.statusUpdateFailed'));
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

  const isAdmin = user?.role === 'admin' || user?.role === 'sudo';

  if (authLoading) return <GlobalLoading />;
  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlobalLoading size="large" tip={t('common.loading')} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-zinc-400">{t('tickets.notFound')}</span>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="default" size="sm" rounded="sm" autoLoading={false} icon={<ArrowLeft size={14} />} onClick={() => router.push('/tickets')} />
        <h1 className="text-2xl font-bold text-zinc-900">{t('tickets.details')}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        {/* 标题和状态 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(ticket.status)}
            <span className="text-xl font-semibold text-zinc-900">{ticket.title}</span>
          </div>
          <TicketStatusBadge status={ticket.status} t={t} />
        </div>

        {/* 元信息 */}
        <div className="mb-5 p-4 bg-zinc-50 rounded-xl">
          <p className="text-xs text-zinc-400">
            {t('tickets.author')}: {ticket.author} · {t('common.createdAt') ?? t('tickets.date')}: {new Date(ticket.date).toLocaleString(locale)} · {t('tickets.template')}: {ticket.template}
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
        <TicketStatusUpdater
          ticket={ticket}
          newStatus={newStatus}
          saving={saving}
          isAdmin={isAdmin}
          onStatusChange={(status) => setNewStatus(status)}
          onSave={handleStatusChange}
          t={t}
        />
      </div>
    </PageContainer>
  );
}
