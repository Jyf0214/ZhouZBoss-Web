'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button, Input, message } from 'antd';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';
import { PageContainer } from '@/components/ui/PageContainer';

interface TicketField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  [key: string]: unknown;
}

interface TicketTemplate {
  slug: string;
  name: string;
  description: string;
  title: string;
  labels: string[];
  fields: TicketField[];
}

export default function NewTicketPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetch('/api/ticket-templates')
      .then(res => { if (!res.ok) throw new Error('工单模板加载失败'); return res.json(); })
      .then(data => setTemplates(data))
		.catch(err => { console.error('Failed to fetch templates:', err); showError('工单模板加载失败'); });
  }, [user, router]);

  const handleTemplateSelect = (template: TicketTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.title ?? '');
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    const missingFields = selectedTemplate.fields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.label);
    if (missingFields.length > 0) {
      showError(t('tickets.fillRequired', { fields: missingFields.join(', ') }));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSlug: selectedTemplate.slug, formData, title }),
      });
      if (res.ok) {
        message.success(t('tickets.createSuccess'));
        router.push('/tickets');
      } else {
        showError(t('tickets.createFailed'));
      }
    } catch (error) {
		console.error('Failed to create ticket:', error);
		showError(t('tickets.createFailed') ?? '工单创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <GlobalLoading />;
  if (!user) return null;

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex items-center gap-3 mb-8">
        <Button size="small" icon={<ArrowLeft size={14} />} onClick={() => router.back()} className="rounded-lg" />
        <h1 className="text-2xl font-bold text-zinc-900">{selectedTemplate ? t('tickets.fillTicket') : t('tickets.selectTemplate')}</h1>
      </div>

      {!selectedTemplate ? (
        <div className="space-y-4">
          {templates.map(template => (
            <div
              key={template.slug}
              onClick={() => handleTemplateSelect(template)}
              className="p-5 bg-white rounded-2xl border border-zinc-100 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText size={20} className="text-blue-500" />
                <span className="font-medium text-sm text-zinc-900">{template.name}</span>
              </div>
              <p className="text-sm text-zinc-400">{template.description}</p>
              {template.labels.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {template.labels.map(label => (
                    <span key={label} className="inline-block px-2 py-0.5 bg-zinc-100 rounded text-xs">{label}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">{t('tickets.title')} *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('tickets.placeholderTitle')} className="rounded-xl" />
          </div>
          {selectedTemplate.fields.map(field => (
            <div key={field.name} className="mb-5">
              <label className="block text-sm font-medium mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'input' && (
                <Input value={formData[field.name] ?? ''} onChange={e => setFormData({ ...formData, [field.name]: e.target.value })} placeholder={`${t('common.input')}${field.label}`} className="rounded-xl" />
              )}
              {field.type === 'textarea' && (
                <textarea
                  value={formData[field.name] ?? ''}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={`${t('common.input')}${field.label}`}
                  className="w-full min-h-[100px] p-3 border border-zinc-200 rounded-xl text-sm resize-vertical outline-none focus:border-zinc-400"
                />
              )}
              {field.type === 'dropdown' && (
                <select
                  value={formData[field.name] ?? ''}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                  className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm"
                >
                  <option value="">{t('common.select')}</option>
                  {field.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3">
            <Button onClick={() => setSelectedTemplate(null)}>{t('common.back')}</Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting} className="bg-zinc-900 rounded-xl">
              {t('tickets.submit')}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
