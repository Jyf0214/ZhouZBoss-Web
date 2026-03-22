'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';
import { Button, Flexbox, Text, Icon } from '@lobehub/ui';
import Link from 'next/link';

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

  useEffect(() => {
    if (!isSudo) {
      router.push('/dashboard');
      return;
    }

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

    fetchTemplates();
  }, [isSudo, router]);

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

  if (!isSudo) return null;

  if (loading) {
    return (
      <Flexbox align="center" justify="center" style={{ height: 400 }}>
        <Text type="secondary">加载中...</Text>
      </Flexbox>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* 标题 */}
      <Flexbox horizontal justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Text fontSize={24} weight={'bold'}>工单管理</Text>
          <Text fontSize={14} type="secondary" style={{ display: 'block', marginTop: 4 }}>
            管理工单模板和规则
          </Text>
        </div>
        <Button type="primary" icon={<Icon icon={Plus} />}>
          创建模板
        </Button>
      </Flexbox>

      {/* 模板列表 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        overflow: 'hidden',
      }}>
        {templates.length > 0 ? (
          templates.map((template, index) => (
            <div
              key={template.id}
              style={{
                padding: '16px 20px',
                borderBottom: index < templates.length - 1 ? '1px solid #e5e5e5' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'var(--ant-color-primary-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon icon={FileText} style={{ color: 'var(--ant-color-primary)' }} />
                </div>
                <div>
                  <Text weight={500}>{template.name}</Text>
                  <Text fontSize={13} type="secondary" style={{ display: 'block', marginTop: 2 }}>
                    {template.description || '暂无描述'}
                  </Text>
                </div>
              </div>
              
              <Flexbox horizontal gap={8}>
                <Button 
                  size="small" 
                  icon={<Icon icon={Edit2} />}
                >
                  编辑
                </Button>
                <Button 
                  size="small" 
                  danger
                  icon={<Icon icon={Trash2} />}
                  onClick={() => handleDelete(template.id)}
                >
                  删除
                </Button>
              </Flexbox>
            </div>
          ))
        ) : (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Icon icon={FileText} style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Text type="secondary">暂无工单模板</Text>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" icon={<Icon icon={Plus} />}>
                创建第一个模板
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
