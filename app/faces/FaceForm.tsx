'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Input, Button as AntButton, Form, Popconfirm, message } from 'antd';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';

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

interface FormValues {
  name: string;
  email: string;
  phone: string;
  group: string;
  content: string;
}

export function FaceForm({ groups, faceData, isEdit = false }: FaceFormProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { t } = useI18n();

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

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload: FormValues & { slug?: string } = {
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
        showError(data.error ?? t('common.error'));
        return;
      }

      message.success(isEdit ? t('common.success') : t('common.success'));
      router.push(`/faces${data.slug ?? faceData?.slug}`);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : t('common.error'));
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
        showError(data.error ?? t('common.error'));
        return;
      }

      message.success(t('common.success'));
      router.push('/faces');
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : t('common.error'));
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
          group: groups.length > 0 ? (groups[0]?.groupName ?? groups[0]!.slug.replace('/', '')) : '',
          content: '',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            label={<span className="text-zinc-700 font-medium">{t('auth.username')} *</span>}
            name="name"
            rules={[{ required: true, message: t('validation.required') }]}
          >
            <Input
              placeholder={t('auth.usernamePlaceholder')}
              className="h-12 rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-zinc-700 font-medium">{t('auth.email')}</span>}
            name="email"
            rules={[
              { type: 'email', message: t('validation.emailInvalid') },
            ]}
          >
            <Input
              placeholder={t('auth.inputEmailPlaceholder')}
              className="h-12 rounded-xl"
              size="large"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            label={<span className="text-zinc-700 font-medium">{t('article.phone') ?? 'Phone'}</span>}
            name="phone"
          >
            <Input
              placeholder={t('article.phonePlaceholder') ?? 'Phone'}
              className="h-12 rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-zinc-700 font-medium">{t('faces.groupName')} *</span>}
            name="group"
            rules={[{ required: true, message: t('validation.required') }]}
          >
            <select
              className="w-full h-12 rounded-xl border border-zinc-200 px-4 text-zinc-900 bg-white focus:outline-none focus:border-zinc-400 transition-colors"
              style={{ fontSize: '16px' }}
            >
              {groups.map((group) => {
                const groupValue = group.groupName ?? group.slug.replace('/', '');
                const groupLabel = group.title ?? groupValue;
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
          label={<span className="text-zinc-700 font-medium">{t('article.content')}</span>}
          name="content"
        >
          <textarea
            placeholder={t('editor.contentPlaceholder')}
            className="w-full min-h-[200px] rounded-xl border border-zinc-200 p-4 text-zinc-900 bg-white focus:outline-none focus:border-zinc-400 transition-colors resize-y"
            style={{ fontSize: '16px', fontFamily: 'inherit' }}
          />
        </Form.Item>

        <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
          <Link href={isEdit && faceData ? `/faces${faceData.slug}` : '/faces'}>
            <AntButton
              type="default"
              icon={<ArrowLeft size={16} />}
              className="h-12 px-6 rounded-xl"
            >
              {t('common.back')}
            </AntButton>
          </Link>

          <div className="flex gap-3">
            {isEdit && (
              <Popconfirm
                title={t('common.confirm')}
                description={t('article.deleteConfirm')}
                onConfirm={handleDelete}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
              >
                <AntButton
                  type="default"
                  danger
                  icon={<Trash2 size={16} />}
                  loading={deleteLoading}
                  className="h-12 px-6 rounded-xl"
                >
                  {t('common.delete')}
                </AntButton>
              </Popconfirm>
            )}
            <AntButton
              type="primary"
              htmlType="submit"
              icon={<Save size={16} />}
              loading={loading}
              className="h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800"
            >
              {isEdit ? t('common.save') : t('common.create')}
            </AntButton>
          </div>
        </div>
      </Form>
    </motion.div>
  );
}
