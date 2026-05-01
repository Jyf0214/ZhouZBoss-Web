'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Eye, Code } from 'lucide-react';
import { Button, message } from 'antd';

const FIELD_TYPES = [
  { value: 'input', label: '文本输入' },
  { value: 'textarea', label: '多行文本' },
  { value: 'dropdown', label: '下拉选择' },
  { value: 'checkboxes', label: '复选框' },
];

function toYamlString(obj: any, indent = 0): string {
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
    } else if (typeof value === 'object' && value !== null) {
      result += `${pad}${key}:\n${toYamlString(value, indent + 1)}`;
    } else {
      result += `${pad}${key}: ${value}\n`;
    }
  }
  return result;
}

export default function NewTicketTemplatePage() {
  const { userRole } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [titleFormat, setTitleFormat] = useState('[Ticket] ');
  const [labels, setLabels] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');
  const [fields, setFields] = useState<any[]>([{
    name: '', label: '', type: 'input', options: [], required: true,
  }]);
  const [body, setBody] = useState('## 描述\n{{description}}\n');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  if (userRole !== 'sudo' && userRole !== 'admin') {
    return <div className="p-8 text-center text-red-500">需要管理员权限</div>;
  }

  const addField = () => {
    setFields([...fields, { name: '', label: '', type: 'input', options: [], required: true }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
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
      message.error('请填写模板名称和正文');
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
        message.success('模板创建成功');
        router.push('/admin/config');
      } else {
        const err = await res.json();
        message.error(err.error || '创建失败');
      }
    } catch (e) {
      message.error('创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">新建工单模板</h1>
          <p className="text-sm text-zinc-400">创建自定义工单模板</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4">基本信息</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">模板名称</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例如：功能请求"
            className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">描述</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="模板描述"
            className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">标题格式</label>
          <input
            type="text"
            value={titleFormat}
            onChange={e => setTitleFormat(e.target.value)}
            placeholder="[Bug] "
            className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4">字段定义</h2>
        {fields.map((field, index) => (
          <div key={index} className="mb-4 p-4 bg-zinc-50 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">字段 {index + 1}</span>
              {fields.length > 1 && (
                <button onClick={() => removeField(index)} className="text-red-500">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs mb-1">字段名</label>
                <input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(index, 'name', e.target.value)}
                  placeholder="environment"
                  className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">显示标签</label>
                <input
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
                <label className="block text-xs mb-1">类型</label>
                <select
                  value={field.type}
                  onChange={e => updateField(index, 'type', e.target.value)}
                  className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm"
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
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
                  必填
                </label>
              </div>
            </div>
            {(field.type === 'dropdown' || field.type === 'checkboxes') && (
              <div>
                <label className="block text-xs mb-1">选项（每行一个）</label>
                <textarea
                  value={(field.options || []).join('\n')}
                  onChange={e => updateField(index, 'options', e.target.value.split('\n').filter(Boolean))}
                  className="w-full min-h-[60px] p-2 border border-zinc-200 rounded-lg text-sm"
                  placeholder="选项1\n选项2"
                />
              </div>
            )}
          </div>
        ))}
        <Button onClick={addField} icon={<Plus size={14} />} className="rounded-xl">
          添加字段
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4">标签与指派人</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">标签</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLabel()}
              placeholder="输入标签"
              className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm"
            />
            <Button onClick={addLabel} size="small">添加</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map(l => (
              <span key={l} className="px-2 py-1 bg-zinc-100 rounded-lg text-xs flex items-center gap-1">
                {l}
                <button onClick={() => removeLabel(l)} className="text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">默认指派人</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={assigneeInput}
              onChange={e => setAssigneeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAssignee()}
              placeholder="用户名"
              className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm"
            />
            <Button onClick={addAssignee} size="small">添加</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignees.map(a => (
              <span key={a} className="px-2 py-1 bg-zinc-100 rounded-lg text-xs flex items-center gap-1">
                {a}
                <button onClick={() => removeAssignee(a)} className="text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-zinc-900">模板正文</h2>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 text-sm text-zinc-500"
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
            {showPreview ? '编辑' : '预览'}
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
            placeholder="使用 {{fieldName}} 作为占位符"
          />
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => router.back()} className="rounded-xl">取消</Button>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          className="bg-zinc-900 hover:bg-zinc-800 rounded-xl"
        >
          创建模板
        </Button>
      </div>
    </div>
  );
}
