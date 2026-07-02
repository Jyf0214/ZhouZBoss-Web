'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { Plus, Trash2, Edit2, FileText, X, Save, Loader2 } from 'lucide-react';
import { Modal, Popconfirm, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface TicketTemplate {
  slug: string;
  name: string;
  description: string;
  fields: TicketField[];
  createdAt: string;
}

interface TicketField {
  /** 唯一标识，用于 React key，不持久化 */
  id: string;
  name: string;
  type: string;
  required: boolean;
}

export default function TicketsPage() {
  const { isSudo } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fields: [{ id: crypto.randomUUID(), name: '', type: 'text', required: true }],
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/ticket-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        showError('工单模板加载失败');
      }
	} catch (error) {
		console.error('Failed to fetch templates:', error);
		showError('工单模板加载失败');
	} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSudo) {
      router.push('/dashboard');
      return;
    }
  }, [isSudo, router]);

  useEffect(() => {
    if (isSudo) {
      const timer = setTimeout(() => {
        void fetchTemplates();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isSudo]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '', fields: [{ id: crypto.randomUUID(), name: '', type: 'text', required: true }] });
    setShowModal(true);
  };

  const handleEdit = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      fields: template.fields.length > 0
        ? template.fields.map(f => ({ ...f, id: f.id ?? crypto.randomUUID() }))
        : [{ id: crypto.randomUUID(), name: '', type: 'text', required: true }],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      message.warning(t('tickets.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const filteredFields = formData.fields.filter(f => f.name);
      const templateBody = filteredFields.map(f => `${f.name}: {{${f.name}}}`).join('\n');
      const res = await fetch('/api/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate?.slug,
          name: formData.name,
          description: formData.description,
          fields: filteredFields,
          body: templateBody,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        void fetchTemplates();
        message.success(t('tickets.saveSuccess'));
      } else {
        const data = await res.json();
        showError(`${t('tickets.saveFailed')}: ${data.error ?? ''}`);
      }
    } catch (error) {
		console.error('Failed to save template:', error);
		showError(`${t('tickets.saveFailed')}: ${error instanceof Error ? error.message : ''}`);
    } finally {
      setSaving(false);
    }
  };

const handleDelete = async (id: string) => {
    setDeleting(id);
    setTemplates(prev => prev.filter(tmpl => tmpl.slug !== id));
    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(`${t('tickets.deleteFailed')}: ${data.error ?? ''}`);
        void fetchTemplates();
      }
    } catch (error) {
		console.error('Failed to delete template:', error);
		showError(`${t('tickets.deleteFailed')}: ${error instanceof Error ? error.message : ''}`);
      void fetchTemplates();
    } finally {
      setDeleting(null);
    }
  };

  const addField = () => {
    setFormData({ ...formData, fields: [...formData.fields, { id: crypto.randomUUID(), name: '', type: 'text', required: true }] });
  };

  const removeField = (index: number) => {
    setFormData({ ...formData, fields: formData.fields.filter((_, i) => i !== index) });
  };

  const updateField = (index: number, field: TicketField) => {
    const newFields = [...formData.fields];
    newFields[index] = field;
    setFormData({ ...formData, fields: newFields });
  };

  if (!isSudo) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlobalLoading size="large" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="4xl">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t('tickets.management')}</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">{t('tickets.subtitle')}</p>
        </div>
        <Button variant="primary" rounded="md" icon={<Plus size={14} />} onClick={handleCreate} autoLoading={false}>
          {t('tickets.createTemplate')}
        </Button>
      </div>

      {/* 模板列表 */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        {templates.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {templates.map((template) => (
              <div key={template.slug} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FileText size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{template.name}</span>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {template.description || t('tickets.noDescription')} · {t('tickets.fieldsCount', { count: template.fields?.length || 0 })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" rounded="sm" icon={<Edit2 size={13} />} onClick={() => handleEdit(template)} autoLoading={false}>{t('tickets.edit')}</Button>
                  <Popconfirm
                    title={t('tickets.deleteConfirm')}
                    onConfirm={() => handleDelete(template.slug)}
                    okButtonProps={{ danger: true, loading: deleting === template.slug }}
                    placement="topRight"
                  >
                    <Button size="sm" variant="danger" rounded="sm" icon={deleting === template.slug ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} disabled={deleting === template.slug} autoLoading={false}>{t('tickets.delete')}</Button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <FileText size={48} className="text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-400 dark:text-zinc-500 mb-4">{t('tickets.noTemplates')}</p>
            <Button variant="primary" rounded="md" icon={<Plus size={14} />} onClick={handleCreate} autoLoading={false}>
              {t('tickets.createFirst')}
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingTemplate ? t('tickets.editTemplate') : t('tickets.createTemplate')}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSave}
        okText={t('tickets.save')}
        cancelText={t('tickets.cancel')}
        okButtonProps={{ icon: <Save size={14} />, loading: saving }}
        width={500}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('tickets.templateName')} *</label>
            <Input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('tickets.placeholderName')}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('tickets.templateDescription')}</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('tickets.placeholderDesc')}
              minH="min-h-[80px]"
              rounded="sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('tickets.formFields')}</label>
              <Button size="sm" rounded="sm" icon={<Plus size={12} />} onClick={addField} autoLoading={false}>{t('tickets.addField')}</Button>
            </div>
            {formData.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(index, { ...field, name: e.target.value })}
                  placeholder={t('tickets.fieldName')}
                  className="flex-1 h-9 px-3 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm outline-none"
                />
                <select
                  value={field.type}
                  onChange={e => updateField(index, { ...field, type: e.target.value })}
                  className="h-9 px-2 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm"
                >
                  <option value="text">{t('tickets.typeText')}</option>
                  <option value="textarea">{t('tickets.typeTextarea')}</option>
                  <option value="number">{t('tickets.typeNumber')}</option>
                  <option value="select">{t('tickets.typeSelect')}</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={field.required} onChange={e => updateField(index, { ...field, required: e.target.checked })} />
                  {t('tickets.required')}
                </label>
                {formData.fields.length > 1 && (
                  <Button variant="danger" size="sm" iconOnly icon={<X size={14}/>} onClick={() => removeField(index)} autoLoading={false} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
