'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Form, Input, Select, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { Save, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { generateMarkdown, type FrontMatter } from '@/lib/markdown';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';

const { TextArea } = Input;

/** 新建联系人表单值 */
interface NewFaceFormValues {
  name: string;
  groups: string[];
  description: string;
  content: string;
}

export default function NewFacePage() {
  const router = useRouter();
  const { isSudo, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm<NewFaceFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  /** 提交表单：生成 Markdown 并推送至 GitHub */
  const handleSubmit = async (values: NewFaceFormValues) => {
    if (!githubRepo) {
      showError(t('faces.githubNotConfigured'));
      return;
    }

    setSubmitting(true);
    try {
      const frontMatter: FrontMatter = {
        title: values.name,
        tags: values.groups.length > 0 ? values.groups : [],
        date: new Date().toISOString(),
      };
      if (values.description) {
        frontMatter.description = values.description;
      }

      const markdownContent = generateMarkdown(frontMatter, values.content);

      const groupPath = values.groups.length > 0
        ? (values.groups[0]?.trim() ?? 'uncategorized')
        : 'uncategorized';

      const safeName = values.name
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, '-');

      const filePath = `faces/${groupPath}/${safeName}.md`;

      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          path: filePath,
          content: markdownContent,
          message: `feat: 新建联系人 "${values.name}"`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t('faces.createFailedShort'));
      }

      message.success(t('faces.createSuccess'));
      router.push(`/faces/${groupPath}/${safeName}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : t('common.error');
      showError(`${t('faces.createFailed')}: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  /** 等待鉴权完成 */
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <div className="flex-1 flex items-center justify-center">
          <GlobalLoading size="large" />
        </div>
      </div>
    );
  }

  /** 非管理员显示无权限提示 */
  if (!isSudo) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <PageContainer maxWidth="4xl">
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-xl flex items-center justify-center mb-6">
              <Lock size={28} className="text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">{t('faces.needAdmin')}</h2>
            <p className="text-zinc-400 mb-8">{t('faces.needAdminDesc')}</p>
            <Link href="/faces">
              <Button
                variant="default"
                icon={<ArrowLeft size={16} />}
                autoLoading={false}
                className="h-10 px-8 rounded-xl"
              >
                {t('faces.backToFaces')}
              </Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <PageContainer maxWidth="4xl">
        <div className="flex flex-col gap-3 mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            {t('faces.newFace')}
          </h1>
          <p className="text-sm text-zinc-400">{t('faces.newFaceDesc')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="space-y-6"
            requiredMark={false}
            initialValues={{
              name: '',
              groups: [],
              description: '',
              content: '',
            }}
          >
            <Form.Item
              label={<span className="text-zinc-700 font-medium">{t('faces.nameLabel')}</span>}
              name="name"
              rules={[{ required: true, message: t('faces.nameRequired') }]}
            >
              <Input
                placeholder={t('faces.namePlaceholder')}
                className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-zinc-700 font-medium">{t('faces.groupsLabel')}</span>}
              name="groups"
              extra={t('faces.groupsHint')}
            >
              <Select
                mode="tags"
                placeholder={t('faces.groupsPlaceholder')}
                className="rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                style={{ minHeight: 40 }}
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-zinc-700 font-medium">{t('faces.descriptionLabel')}</span>}
              name="description"
              extra={t('faces.descriptionHint')}
            >
              <Input
                placeholder={t('faces.descriptionPlaceholder')}
                className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-zinc-700 font-medium">{t('faces.contentLabel')} *</span>}
              name="content"
              rules={[{ required: true, message: t('faces.contentRequired') }]}
              extra={t('faces.contentHint')}
            >
              <TextArea
                placeholder={t('faces.contentPlaceholder')}
                className="rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                rows={12}
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </Form.Item>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
              <Link href="/faces">
                <Button
                  variant="default"
                  icon={<ArrowLeft size={16} />}
                  autoLoading={false}
                  className="h-10 px-6 rounded-xl"
                >
                  {t('common.back')}
                </Button>
              </Link>

              <Button
                variant="primary"
                size="lg"
                rounded="md"
                type="submit"
                icon={<Save size={16} />}
                loading={submitting}
              >
                {t('common.create')}
              </Button>
            </div>
          </Form>
        </div>
      </PageContainer>
    </div>
  );
}
