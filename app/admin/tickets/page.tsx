'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, FileText, X, Save } from 'lucide-react';
import { Button, Spin, Modal } from 'antd';

interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  fields: any[];
  createdAt: string;
}

export default function TicketsPage() {
  const { isSudo } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fields: [{ name: '', type: 'text', required: true }],
  });

  useEffect(() => {
    if (!isSudo) {
      router.push('/dashboard');
      return;
    }
    fetchTemplates();
  }, [isSudo, router]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/ticket-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', description: '', fields: [{ name: '', type: 'text', required: true }] });
    setShowModal(true);
  };

  const handleEdit = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      fields: template.fields.length > 0 ? template.fields : [{ name: '', type: 'text', required: true }],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('请输入模板名称');
      return;
    }
    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate?.id,
          name: formData.name,
          description: formData.description,
          fields: formData.fields.filter(f => f.name),
        }),
      });
      if (res.ok) {
        setShowModal(false);
        fetchTemplates();
        alert(editingTemplate ? '模板已更新' : '模板已创建');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个工单模板吗？')) return;
    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const addField = () => {
    setFormData({ ...formData, fields: [...formData.fields, { name: '', type: 'text', required: true }] });
  };

  const removeField = (index: number) => {
    setFormData({ ...formData, fields: formData.fields.filter((_, i) => i !== index) });
  };

  const updateField = (index: number, field: any) => {
    const newFields = [...formData.fields];
    newFields[index] = field;
    setFormData({ ...formData, fields: newFields });
  };

  if (!isSudo) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">工单管理</h1>
          <p className="text-sm text-zinc-400 mt-1">管理工单模板和规则</p>
        </div>
        <Button type="primary" icon={<Plus size={14} />} onClick={handleCreate} className="bg-zinc-900 rounded-xl">
          创建模板
        </Button>
      </div>

      {/* 模板列表 */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {templates.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {templates.map((template) => (
              <div key={template.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FileText size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <span className="font-medium text-sm text-zinc-900">{template.name}</span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {template.description || '暂无描述'} · {template.fields?.length || 0} 个字段
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="small" icon={<Edit2 size={13} />} onClick={() => handleEdit(template)} className="rounded-lg">编辑</Button>
                  <Button size="small" danger icon={<Trash2 size={13} />} onClick={() => handleDelete(template.id)} className="rounded-lg">删除</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <FileText size={48} className="text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">暂无工单模板</p>
            <Button type="primary" icon={<Plus size={14} />} onClick={handleCreate} className="bg-zinc-900 rounded-xl">
              创建第一个模板
            </Button>
          </div>
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '创建模板'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ icon: <Save size={14} /> }}
        width={500}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">模板名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：删除文章申请"
              className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">模板描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="描述这个模板的用途"
              className="w-full min-h-[80px] p-3 border border-zinc-200 rounded-lg text-sm resize-vertical outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">表单字段</label>
              <Button size="small" icon={<Plus size={12} />} onClick={addField} className="rounded-lg">添加字段</Button>
            </div>
            {formData.fields.map((field, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(index, { ...field, name: e.target.value })}
                  placeholder="字段名称"
                  className="flex-1 h-9 px-3 border border-zinc-200 rounded-md text-sm outline-none"
                />
                <select
                  value={field.type}
                  onChange={e => updateField(index, { ...field, type: e.target.value })}
                  className="h-9 px-2 border border-zinc-200 rounded-md text-sm"
                >
                  <option value="text">文本</option>
                  <option value="textarea">长文本</option>
                  <option value="number">数字</option>
                  <option value="select">下拉选择</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={field.required} onChange={e => updateField(index, { ...field, required: e.target.checked })} />
                  必填
                </label>
                {formData.fields.length > 1 && (
                  <button onClick={() => removeField(index)} className="p-1 text-red-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
