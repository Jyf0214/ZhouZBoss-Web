'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button, Input, Form, Avatar, message } from 'antd';
import type { Rule } from 'antd/es/form';
import { showError } from '@/lib/error';
import { useGitHubDiff } from '@/hooks/use-github-diff';
import { User, AtSign, Image as ImageIcon, Save, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import ConfigSection from '@/components/ui/ConfigSection';
import yaml from 'js-yaml';

// 表单字段组件，适配 Ant Design Form
interface SettingsFormFieldProps {
  name: string;
  label: string;
  icon: React.ReactNode;
  placeholder?: string;
  extra?: string;
  rules?: Rule[];
  children?: React.ReactNode;
}

function SettingsFormField({
  name,
  label,
  icon,
  placeholder,
  extra,
  rules,
  children,
}: SettingsFormFieldProps) {
  return (
    <Form.Item
      name={name}
      label={
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          {label}
        </div>
      }
      extra={extra && <span className="text-xs text-zinc-400">{extra}</span>}
      rules={rules}
    >
      {children || (
        <Input
          placeholder={placeholder}
          className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
          allowClear
        />
      )}
    </Form.Item>
  );
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  const { showDiff, DiffModal } = useGitHubDiff({
    repo: githubRepo || '',
  });

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
      const avatarUrlValue = values.avatarUrl || '';
      const uid = user?.uid;

      // 1. 保存用户名/昵称到数据库（不含头像）
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          name: values.displayName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || t('settings.saveFailed'));
        return;
      }

      // 2. 头像同步到 GitHub config.yaml（含用户确认弹窗）
      if (uid && avatarUrlValue && githubRepo) {
        const configRes = await fetch('/api/config');
        if (!configRes.ok) throw new Error('读取配置失败');
        const configData = await configRes.json();
        const remoteRaw = configData._remoteConfig || '';
        if (!remoteRaw) throw new Error('远程配置为空');

        const remoteObj = (yaml.load(remoteRaw) || {}) as Record<string, unknown>;
        const users = (remoteObj.users || {}) as Record<string, unknown>;
        const userEntry = (users[uid] || {}) as Record<string, unknown>;
        users[uid] = { ...userEntry, avatar: avatarUrlValue };
        remoteObj.users = users;
        const newYaml = yaml.dump(remoteObj, { lineWidth: -1 });

        showDiff({
          filePath: 'config.yaml',
          oldContent: remoteRaw,
          newContent: newYaml,
          onSubmit: async () => {
            setLoading(true);
            try {
              const syncRes = await fetch('/api/github/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'config-yaml',
                  content: newYaml,
                  message: `chore: update avatar for user ${user?.name || uid}`,
                }),
              });
              if (!syncRes.ok) {
                const err = await syncRes.json();
                throw new Error(err.error || '同步失败');
              }
              message.success(t('settings.saveSuccess'));
              await refresh();
            } catch (e) {
              showError(`头像同步失败: ${e instanceof Error ? e.message : '未知错误'}`);
              throw e;
            } finally {
              setLoading(false);
            }
          },
        });
      } else {
        message.success(t('settings.saveSuccess'));
        await refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.saveFailed');
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = Form.useWatch('avatarUrl', form);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {t('settings.title')}
            </h1>
            <p className="text-zinc-400 text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>

        {/* 用户卡片 */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-4">
          <div className="p-6">
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
        <ConfigSection title={t('settings.title')} color="bg-zinc-500">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{ avatarUrl: '', username: '', displayName: '' }}
            requiredMark={false}
          >
            <SettingsFormField
              name="avatarUrl"
              label={t('settings.avatarUrl')}
              icon={<ImageIcon size={12} className="text-zinc-500" />}
              placeholder={t('settings.avatarUrlPlaceholder')}
              extra={t('settings.avatarUrlHint')}
            >
              <Input
                placeholder={t('settings.avatarUrlPlaceholder')}
                className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
                allowClear
              />
            </SettingsFormField>

            <SettingsFormField
              name="username"
              label={t('settings.username')}
              icon={<AtSign size={12} className="text-zinc-500" />}
              placeholder={t('settings.usernamePlaceholder')}
              rules={[
                { required: true, message: t('validation.required') },
                { min: 3, max: 20, message: t('validation.usernameFormat') },
                { pattern: /^[a-zA-Z0-9_]+$/, message: t('validation.usernameFormat') },
              ]}
            >
              <Input
                placeholder={t('settings.usernamePlaceholder')}
                className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
              />
            </SettingsFormField>

            <SettingsFormField
              name="displayName"
              label={t('settings.displayName')}
              icon={<User size={12} className="text-zinc-500" />}
              placeholder={t('settings.displayNamePlaceholder')}
              extra={t('settings.displayNameHint')}
            >
              <Input
                placeholder={t('settings.displayNamePlaceholder')}
                className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900"
              />
            </SettingsFormField>

            <Form.Item className="mb-0 pt-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={!loading && <Save size={14} />}
                block
                className="!bg-zinc-900 hover:!bg-zinc-800 !h-10 !rounded-lg !text-sm !font-semibold !border-0 shadow-sm transition-all"
              >
                {t('common.save')}
              </Button>
            </Form.Item>
          </Form>
        </ConfigSection>

        {DiffModal}
      </div>
    </div>
  );
}
