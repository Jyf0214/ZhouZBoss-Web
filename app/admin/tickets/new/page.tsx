'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { Plus, Trash2, Eye, Code } from 'lucide-react';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';

const FIELD_TYPES = [
  { value: 'input', labelKey: 'tickets.typeText' },
  { value: 'textarea', labelKey: 'tickets.typeTextarea' },
  { value: 'dropdown', labelKey: 'tickets.typeSelect' },
  { value: 'checkboxes', labelKey: 'tickets.typeSelect' }, // Assuming checkboxes is same as select in i18n for now
];

  interface TicketFieldDef {
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  [key: string]: unknown;
}

function toYamlString(obj: Record<string, unknown>, indent = 0): string {
  const pad = '  '.repeat(indent);
  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result += `${pad}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          result += `${pad}  - ${toYamlString(item, 0).trim()}\n`;
        } else {
          result += `${pad}  - ${item}\n`;
        }
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${pad}${key}:\n${toYamlString(value as Record<string, unknown>, indent + 1)}`;
    } else {
      result += `${pad}${key}: ${value}\n`;
    }
  }
  return result;
}

export default function NewTicketTemplatePage() {
  const { userRole } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [titleFormat, setTitleFormat] = useState('[Ticket] ');
  const [labels, setLabels] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');
  const [fields, setFields] = useState<TicketFieldDef[]>([{
    name: '', label: '', type: 'input', options: [], required: true,
  }]);
  const [body, setBody] = useState('## 描述\n{{description}}\n');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  if (userRole !== 'sudo' && userRole !== 'admin') {
    return <div className="p-8 text-center text-red-500">{t('tickets.accessDenied')}</div>;
  }

  const addField = () => {
    setFields([...fields, { name: '', label: '', type: 'input', options: [], required: true }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: string, value: string | boolean | string[]) => {
    setFields(prev => prev.map((field, i) => i === index ? { ...field, [key]: value } : field));
  };

  const addLabel = () => {
    if (labelInput && !labels.includes(labelInput)) {
      setLabels([...labels, labelInput]);
      setLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setLabels(labels.filter(l => l !== label));
  };

  const addAssignee = () => {
    if (assigneeInput && !assignees.includes(assigneeInput)) {
      setAssignees([...assignees, assigneeInput]);
      setAssigneeInput('');
    }
  };

  const removeAssignee = (assignee: string) => {
    setAssignees(assignees.filter(a => a !== assignee));
  };

  const generateFrontMatter = () => {
    return {
      name, description, title: titleFormat,
      labels, assignees,
      fields: fields.filter(f => f.name).map(f => ({
        name: f.name,
        label: f.label || f.name,
        type: f.type,
        ...(f.options.length > 0 ? { options: f.options } : {}),
        required: f.required,
      })),
    };
  };

  const generateMarkdown = () => {
    return `---\n${toYamlString(generateFrontMatter())}---\n\n${body}`;
  };

  const handleSave = async () => {
    if (!name || !body) {
      showError(t('tickets.fillNameAndBody'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, title: titleFormat, labels, assignees, fields, body,
        }),
      });
      if (res.ok) {
        message.success(t('tickets.saveSuccess'));
        router.push('/admin/config');
      } else {
        const err = await res.json();
        showError(err.error ?? t('tickets.saveFailed'));
      }
    } catch {
      showError(t('tickets.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('tickets.newTemplate')}</h1>
          <p className="text-sm text-zinc-400">{t('tickets.customTemplateDesc')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4">{t('tickets.basicInfo')}</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('tickets.templateName')}</label>
          <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('tickets.placeholderName')}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('tickets.templateDescription')}</label>
          <Input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('tickets.placeholderDesc')}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('tickets.titleFormat')}</label>
          <Input
            type="text"
            value={titleFormat}
            onChange={e => setTitleFormat(e.target.value)}
            placeholder="[Bug] "
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4">{t('tickets.formFields')}</h2>
        {fields.map((field, index) => (
          <div key={index} className="mb-4 p-4 bg-zinc-50 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">{t('tickets.fieldName')} {index + 1}</span>
              {fields.length > 1 && (
                <button onClick={() => removeField(index)} className="text-red-500">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs mb-1">{t('tickets.fieldName')}</label>
                <Input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(index, 'name', e.target.value)}
                  placeholder="environment"
                  className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('tickets.inputLabel')}</label>
                <Input
                  type="text"
                  value={field.label}
                  onChange={e => updateField(index, 'label', e.target.value)}
                  placeholder="环境"
                  className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs mb-1">{t('tickets.fieldType')}</label>
                <select
                  value={field.type}
                  onChange={e => updateField(index, 'type', e.target.value)}
                  className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm"
                >
                  {FIELD_TYPES.map(t_type => (
                    <option key={t_type.value} value={t_type.value}>{t(t_type.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => updateField(index, 'required', e.target.checked)}
                  />
                  {t('tickets.required')}
                </label>
              </div>
            </div>
            {(field.type === 'dropdown' || field.type === 'checkboxes') && (
              <div>
                <label className="block text-xs mb-1">{t('tickets.options')}</label>
                <textarea
                  value={(field.options || []).join('\n')}
                  onChange={e => updateField(index, 'options', e.target.value.split('\n').filter(Boolean))}
                  className="w-full min-h-[60px] p-2 border border-zinc-200 rounded-lg text-sm"
                  placeholder={t('tickets.placeholderOptions')}
                />
              </div>
            )}
          </div>
        ))}
        <Button onClick={addField} icon={<Plus size={14} />} variant="primary" size="sm">
          {t('tickets.addField')}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4">{t('tickets.labels')}与{t('tickets.assignees')}</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('tickets.labels')}</label>
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLabel()}
              placeholder={t('tickets.enterLabel')}
              className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm"
            />
            <Button onClick={addLabel} size="sm">{t('tickets.add')}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map(l => (
              <Tag key={l} size="sm" className="flex items-center gap-1">
                {l}
                <button onClick={() => removeLabel(l)} className="text-red-500">×</button>
              </Tag>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('tickets.assignees')}</label>
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              value={assigneeInput}
              onChange={e => setAssigneeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAssignee()}
              placeholder={t('tickets.username')}
              className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm"
            />
            <Button onClick={addAssignee} size="sm">{t('tickets.add')}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignees.map(a => (
              <Tag key={a} size="sm" className="flex items-center gap-1">
                {a}
                <button onClick={() => removeAssignee(a)} className="text-red-500">×</button>
              </Tag>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-zinc-900">{t('tickets.markdownBody')}</h2>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 text-sm text-zinc-500"
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
            {showPreview ? t('tickets.editor') : t('tickets.preview')}
          </button>
        </div>
        {showPreview ? (
          <pre className="p-3 bg-zinc-50 rounded-lg text-xs overflow-auto whitespace-pre-wrap">
            {generateMarkdown()}
          </pre>
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full min-h-[200px] p-3 border border-zinc-200 rounded-lg text-sm font-mono"
            placeholder={t('tickets.placeholderBody')}
          />
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => router.back()} variant="default">{t('tickets.cancel')}</Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
        >
          {t('tickets.createTemplate')}
        </Button>
      </div>
    </PageContainer>
  );
}
