'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Input, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';
import { PageContainer } from '@/components/ui/PageContainer';
import { Tag } from '@/components/ui/Tag';

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
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    const controller = new AbortController();

    async function fetchTemplates() {
      try {
        const res = await fetch('/api/ticket-templates', { signal: controller.signal });
        if (!res.ok) throw new Error(t('tickets.templateLoadFailed'));
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch templates:', err);
        showError(t('tickets.templateLoadFailed'));
      }
    }
    void fetchTemplates();

    return () => controller.abort();
  }, [authLoading, user, router, t]);

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
		showError(t('tickets.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <GlobalLoading />;
  if (!user) return null;

  return (
    <PageContainer maxWidth="3xl">
      <div className="flex items-center gap-3 mb-8">
        <Button size="sm" autoLoading={false} icon={<ArrowLeft size={14} />} onClick={() => router.back()} rounded="sm" />
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
                    <Tag key={label} variant="light" size="sm">{label}</Tag>
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
                <Textarea
                  value={formData[field.name] ?? ''}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={`${t('common.input')}${field.label}`}
                  minH="min-h-[100px]"
                  rounded="md"
                />
              )}
              {field.type === 'dropdown' && (
                <Select
                  value={formData[field.name] ?? ''}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                >
                  <option value="">{t('common.select')}</option>
                  {field.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3">
            <Button autoLoading={false} onClick={() => setSelectedTemplate(null)}>{t('common.back')}</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {t('tickets.submit')}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
