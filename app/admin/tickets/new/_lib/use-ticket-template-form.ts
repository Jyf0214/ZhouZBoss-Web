// 工单模板表单状态管理 hook
'use client';

import { useCallback, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { showError } from '@/lib/error';
import { toYamlString } from './yaml';
import type { TicketFieldDef } from './types';

const DEFAULT_FIELD: TicketFieldDef = {
  name: '',
  label: '',
  type: 'input',
  options: [],
  required: true,
};

// 单个字段值更新
type FieldValue = string | boolean | string[];

export function useTicketTemplateForm() {
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
  const [fields, setFields] = useState<TicketFieldDef[]>([DEFAULT_FIELD]);
  const [body, setBody] = useState('## 描述\n{{description}}\n');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // 添加新字段
  const addField = useCallback(() => {
    setFields(prev => [...prev, DEFAULT_FIELD]);
  }, []);

  // 移除指定索引的字段
  const removeField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 更新指定字段的某个属性
  const updateField = useCallback((index: number, key: string, value: FieldValue) => {
    setFields(prev => prev.map((field, i) => (i === index ? { ...field, [key]: value } : field)));
  }, []);

  // 标签:添加 / 移除
  const addLabel = useCallback(() => {
    if (!labelInput || labels.includes(labelInput)) return;
    setLabels(prev => [...prev, labelInput]);
    setLabelInput('');
  }, [labelInput, labels]);

  const removeLabel = useCallback((label: string) => {
    setLabels(prev => prev.filter(l => l !== label));
  }, []);

  // 受理人:添加 / 移除
  const addAssignee = useCallback(() => {
    if (!assigneeInput || assignees.includes(assigneeInput)) return;
    setAssignees(prev => [...prev, assigneeInput]);
    setAssigneeInput('');
  }, [assigneeInput, assignees]);

  const removeAssignee = useCallback((assignee: string) => {
    setAssignees(prev => prev.filter(a => a !== assignee));
  }, []);

  // 生成 front matter 对象
  const generateFrontMatter = useCallback((): Record<string, unknown> => {
    return {
      name,
      description,
      title: titleFormat,
      labels,
      assignees,
      fields: fields
        .filter(f => f.name)
        .map(f => ({
          name: f.name,
          label: f.label || f.name,
          type: f.type,
          ...(f.options.length > 0 ? { options: f.options } : {}),
          required: f.required,
        })),
    };
  }, [name, description, titleFormat, labels, assignees, fields]);

  // 生成完整 Markdown 字符串
  const generateMarkdown = useCallback(() => {
    return `---\n${toYamlString(generateFrontMatter())}---\n\n${body}`;
  }, [generateFrontMatter, body]);

  // 切换预览态
  const togglePreview = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // 取消
  const cancel = useCallback(() => {
    router.back();
  }, [router]);

  // 保存到后端
  const handleSave = useCallback(async () => {
    if (!name || !body) {
      showError(t('tickets.fillNameAndBody'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, title: titleFormat, labels, assignees, fields, body }),
      });
      if (res.ok) {
        message.success(t('tickets.saveSuccess'));
        router.push('/admin/tickets');
        return;
      }
      const err = await res.json();
      showError(err.error ?? t('tickets.saveFailed'));
    } catch {
      showError(t('tickets.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [name, description, titleFormat, labels, assignees, fields, body, t, router]);

  return {
    userRole,
    t,
    // 基础信息
    name, setName,
    description, setDescription,
    titleFormat, setTitleFormat,
    // 字段
    fields, addField, removeField, updateField,
    // 标签
    labels, labelInput, setLabelInput, addLabel, removeLabel,
    // 受理人
    assignees, assigneeInput, setAssigneeInput, addAssignee, removeAssignee,
    // Markdown
    body, setBody, showPreview, togglePreview, generateMarkdown,
    // 操作
    saving, handleSave, cancel,
  };
}
