'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button, Input, Form, Avatar, message } from 'antd';
import type { Rule } from 'antd/es/form';
import { showError } from '@/lib/error';
import { getFileFromGithub, updateFileInGithub } from '@/lib/github';
import { useGitHubDiff } from '@/hooks/use-github-diff';
import { User, AtSign, Image as ImageIcon, Save, ArrowLeft, Check, Github } from 'lucide-react';
import Link from 'next/link';
import ConfigSection from '@/components/ui/ConfigSection';

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
  const [loadingRemote, setLoadingRemote] = useState(false);

  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

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

  useEffect(() => {
    if (!githubRepo || !githubToken || !user?.uid) return;

    const fetchRemoteConfig = async () => {
      setLoadingRemote(true);
      try {
        await getFileFromGithub(githubRepo, githubToken, 'config.json');
      } catch (err) {
        console.error('Failed to fetch remote config:', err);
      } finally {
        setLoadingRemote(false);
      }
    };

    fetchRemoteConfig();
  }, [githubRepo, githubToken, user?.uid]);

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
        showError(data.error || t('settings.saveFailed'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.saveFailed');
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = Form.useWatch('avatarUrl', form);

  // 同步头像到 GitHub
  const handleSyncAvatarToGithub = async () => {
    const avatarUrlValue = form.getFieldValue('avatarUrl') || '';

    if (!user?.uid) {
      showError('用户 ID 不存在');
      return;
    }

    try {
      const configResult = await getFileFromGithub(githubRepo!, githubToken!, 'config.json');
      const configContent = configResult?.content || '{}';
      const config = JSON.parse(configContent);

      const newUsers = {
        ...config.users,
        [user.uid]: {
          ...config.users?.[user.uid],
          avatar: avatarUrlValue,
        },
      };
      const newConfigContent = JSON.stringify({ ...config, users: newUsers }, null, 2);

      showDiff({
        filePath: 'config.json',
        oldContent: configContent,
        newContent: newConfigContent,
        onSubmit: async () => {
          await updateFileInGithub({
            repo: githubRepo!,
            token: githubToken!,
            path: 'config.json',
            content: newConfigContent,
            message: `chore: update avatar for user ${user.name || user.uid}`,
          });
        },
      });
    } catch {
      showError('同步失败');
    }
  };

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
              <div className="flex gap-2">
                <Input
                  placeholder={t('settings.avatarUrlPlaceholder')}
                  className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300 focus:!border-zinc-900 flex-1"
                  allowClear
                />
                {githubRepo && githubToken && (
                  <Button
                    icon={<Github size={14} />}
                    onClick={handleSyncAvatarToGithub}
                    loading={loadingRemote}
                    className="!h-10 !rounded-lg !text-sm !border-zinc-200 hover:!border-zinc-300"
                  >
                    {t('settings.syncToGithub') || '同步到 GitHub'}
                  </Button>
                )}
              </div>
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
