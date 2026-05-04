'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button, Input, Form, message, Avatar } from 'antd';
import { User, AtSign, Image as ImageIcon, Save, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        avatarUrl: user.avatar || '',
        username: user.name || '',
        displayName: user.displayName || user.name || '',
      });
    }
  }, [user, form]);

  const handleSave = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: values.avatarUrl || undefined,
          username: values.username,
          name: values.displayName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(t('settings.saveSuccess'));
        await refresh();
      } else {
        message.error(data.error || t('settings.saveFailed'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.saveFailed');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = Form.useWatch('avatarUrl', form);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {t('settings.title')}
            </h1>
            <p className="text-zinc-400 text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>

        {/* 用户卡片 */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-4">
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar
                  size={72}
                  src={avatarUrl || undefined}
                  icon={!avatarUrl && <User size={28} />}
                  className="bg-zinc-100 text-zinc-400 shrink-0 border-2 border-white shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-900 mb-0.5">
                  {user?.displayName || user?.name || '用户'}
                </div>
                <div className="text-sm text-zinc-400">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-8">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{ avatarUrl: '', username: '', displayName: '' }}
            requiredMark={false}
          >
            <Form.Item
              name="avatarUrl"
              label={
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
                    <ImageIcon size={12} className="text-zinc-500" />
                  </div>
                  {t('settings.avatarUrl')}
                </div>
              }
              extra={<span className="text-xs text-zinc-400">{t('settings.avatarUrlHint')}</span>}
            >
              <Input
                placeholder={t('settings.avatarUrlPlaceholder')}
                className="!h-11 !rounded-xl !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="username"
              label={
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
                    <AtSign size={12} className="text-zinc-500" />
                  </div>
                  {t('settings.username')}
                </div>
              }
              rules={[
                { required: true, message: t('validation.required') },
                { min: 3, max: 20, message: t('validation.usernameFormat') },
                { pattern: /^[a-zA-Z0-9_]+$/, message: t('validation.usernameFormat') },
              ]}
            >
              <Input
                placeholder={t('settings.usernamePlaceholder')}
                className="!h-11 !rounded-xl !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
              />
            </Form.Item>

            <Form.Item
              name="displayName"
              label={
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                  <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
                    <User size={12} className="text-zinc-500" />
                  </div>
                  {t('settings.displayName')}
                </div>
              }
              extra={<span className="text-xs text-zinc-400">{t('settings.displayNameHint')}</span>}
            >
              <Input
                placeholder={t('settings.displayNamePlaceholder')}
                className="!h-11 !rounded-xl !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
              />
            </Form.Item>

            <Form.Item className="mb-0 pt-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={!loading && <Save size={14} />}
                block
                className="!bg-zinc-900 hover:!bg-zinc-800 !h-11 !rounded-xl !text-sm !font-semibold !border-0 shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-900/25 transition-all"
              >
                {t('common.save')}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
