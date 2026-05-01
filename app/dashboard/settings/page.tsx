'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button, Input, Form, message, Avatar } from 'antd';
import { User, AtSign, Image, Save } from 'lucide-react';

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

  const handleSave = async (values: any) => {
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
    } catch (error: any) {
      message.error(error.message || t('settings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = Form.useWatch('avatarUrl', form);

  return (
    <div className="p-6 md:p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-black tracking-tight text-zinc-900 mb-1">
        {t('settings.title')}
      </h1>
      <p className="text-zinc-400 text-sm mb-8">{t('settings.subtitle')}</p>

      <div className="bg-white rounded-2xl border border-zinc-100 p-8">
        {/* 头像预览 */}
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-zinc-50">
          <Avatar
            size={72}
            src={avatarUrl || undefined}
            icon={!avatarUrl && <User size={28} />}
            className="bg-zinc-100 text-zinc-400 shrink-0"
          />
          <div>
            <div className="text-lg font-bold text-zinc-900">
              {user?.displayName || user?.name || '用户'}
            </div>
            <div className="text-sm text-zinc-400">{user?.email}</div>
          </div>
        </div>

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
                <Image size={14} />
                {t('settings.avatarUrl')}
              </div>
            }
            extra={<span className="text-xs text-zinc-400">{t('settings.avatarUrlHint')}</span>}
          >
            <Input
              placeholder={t('settings.avatarUrlPlaceholder')}
              className="h-12 rounded-xl text-base"
            />
          </Form.Item>

          <Form.Item
            name="username"
            label={
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <AtSign size={14} />
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
              className="h-12 rounded-xl text-base"
            />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <User size={14} />
                {t('settings.displayName')}
              </div>
            }
            extra={<span className="text-xs text-zinc-400">{t('settings.displayNameHint')}</span>}
          >
            <Input
              placeholder={t('settings.displayNamePlaceholder')}
              className="h-12 rounded-xl text-base"
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-8">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<Save size={14} />}
              block
              className="bg-zinc-900 hover:bg-zinc-800 h-12 rounded-xl text-base font-semibold"
            >
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
