'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button, Input } from 'antd';

interface TicketTemplate {
  slug: string;
  name: string;
  description: string;
  title: string;
  labels: string[];
  fields: any[];
}

export default function NewTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetch('/api/ticket-templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error('Failed to fetch templates:', err));
  }, [user, router]);

  const handleTemplateSelect = (template: TicketTemplate) => {
    setSelectedTemplate(template);
    setTitle(template.title || '');
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    const missingFields = selectedTemplate.fields
      .filter(f => f.required && !formData[f.name])
      .map(f => f.label);
    if (missingFields.length > 0) {
      alert(`请填写必填字段: ${missingFields.join(', ')}`);
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
        alert('工单创建成功！');
        router.push('/tickets');
      } else {
        alert('创建工单失败');
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('创建工单失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button size="small" icon={<ArrowLeft size={14} />} onClick={() => router.back()} className="rounded-lg" />
        <h1 className="text-2xl font-bold text-zinc-900">{selectedTemplate ? '填写工单' : '选择模板'}</h1>
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
            <label className="block text-sm font-medium mb-2">工单标题 *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="输入工单标题" className="rounded-xl" />
          </div>
          {selectedTemplate.fields.map(field => (
            <div key={field.name} className="mb-5">
              <label className="block text-sm font-medium mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'input' && (
                <Input value={formData[field.name] || ''} onChange={e => setFormData({ ...formData, [field.name]: e.target.value })} placeholder={`输入${field.label}`} className="rounded-xl" />
              )}
              {field.type === 'textarea' && (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={`输入${field.label}`}
                  className="w-full min-h-[100px] p-3 border border-zinc-200 rounded-xl text-sm resize-vertical outline-none focus:border-zinc-400"
                />
              )}
              {field.type === 'dropdown' && (
                <select
                  value={formData[field.name] || ''}
                  onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                  className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm"
                >
                  <option value="">请选择</option>
                  {field.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3">
            <Button onClick={() => setSelectedTemplate(null)}>返回</Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting} className="bg-zinc-900 rounded-xl">
              提交工单
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
