'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Input, Button, Form, message, Popconfirm } from 'antd';

interface GroupItem {
  slug: string;
  title: string;
  groupName?: string;
}

interface FaceData {
  slug: string;
  name: string;
  email: string;
  phone: string;
  group: string;
  content: string;
}

interface FaceFormProps {
  groups: GroupItem[];
  faceData?: FaceData;
  isEdit?: boolean;
}

export function FaceForm({ groups, faceData, isEdit = false }: FaceFormProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (faceData) {
      form.setFieldsValue({
        name: faceData.name,
        email: faceData.email,
        phone: faceData.phone,
        group: faceData.group,
        content: faceData.content,
      });
    }
  }, [faceData, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload: any = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        group: values.group,
        content: values.content,
      };

      let response;
      if (isEdit && faceData) {
        payload.slug = faceData.slug;
        response = await fetch('/api/faces', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/faces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        message.error(data.error || '操作失败');
        return;
      }

      message.success(isEdit ? '联系人已更新' : '联系人已创建');
      router.push(`/faces${data.slug || faceData?.slug}`);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!faceData) return;
    setDeleteLoading(true);
    try {
      const response = await fetch('/api/faces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: faceData.slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.error || '删除失败');
        return;
      }

      message.success('联系人已删除');
      router.push('/faces');
    } catch (error: any) {
      message.error(error.message || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="space-y-6"
        initialValues={{
          name: '',
          email: '',
          phone: '',
          group: groups.length > 0 ? groups[0].groupName || groups[0].slug.replace('/', '') : '',
          content: '',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            label={<span className="text-zinc-700 font-medium">姓名 *</span>}
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input
              placeholder="请输入姓名"
              className="h-12 rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-zinc-700 font-medium">邮箱</span>}
            name="email"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              placeholder="请输入邮箱"
              className="h-12 rounded-xl"
              size="large"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            label={<span className="text-zinc-700 font-medium">电话</span>}
            name="phone"
          >
            <Input
              placeholder="请输入电话号码"
              className="h-12 rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-zinc-700 font-medium">分组 *</span>}
            name="group"
            rules={[{ required: true, message: '请选择分组' }]}
          >
            <select
              className="w-full h-12 rounded-xl border border-zinc-200 px-4 text-zinc-900 bg-white focus:outline-none focus:border-zinc-400 transition-colors"
              style={{ fontSize: '16px' }}
            >
              {groups.map((group) => {
                const groupValue = group.groupName || group.slug.replace('/', '');
                const groupLabel = group.title || groupValue;
                return (
                  <option key={group.slug} value={groupValue}>
                    {groupLabel}
                  </option>
                );
              })}
            </select>
          </Form.Item>
        </div>

        <Form.Item
          label={<span className="text-zinc-700 font-medium">备注信息</span>}
          name="content"
        >
          <textarea
            placeholder="请输入备注信息（支持 Markdown 格式）"
            className="w-full min-h-[200px] rounded-xl border border-zinc-200 p-4 text-zinc-900 bg-white focus:outline-none focus:border-zinc-400 transition-colors resize-y"
            style={{ fontSize: '16px', fontFamily: 'inherit' }}
          />
        </Form.Item>

        <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
          <Link href={isEdit && faceData ? `/faces${faceData.slug}` : '/faces'}>
            <Button
              type="default"
              icon={<ArrowLeft size={16} />}
              className="h-12 px-6 rounded-xl"
            >
              返回
            </Button>
          </Link>

          <div className="flex gap-3">
            {isEdit && (
              <Popconfirm
                title="确认删除"
                description="删除后无法恢复，确定要删除此联系人吗？"
                onConfirm={handleDelete}
                okText="确定"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="default"
                  danger
                  icon={<Trash2 size={16} />}
                  loading={deleteLoading}
                  className="h-12 px-6 rounded-xl"
                >
                  删除
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              htmlType="submit"
              icon={<Save size={16} />}
              loading={loading}
              className="h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800"
            >
              {isEdit ? '保存修改' : '创建联系人'}
            </Button>
          </div>
        </div>
      </Form>
    </motion.div>
  );
}
