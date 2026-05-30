'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Form, Input, Button, Select, message } from 'antd';
import { Save, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { generateMarkdown, type FrontMatter } from '@/lib/markdown';
import { showError } from '@/lib/error';
import { Navbar } from '@/components/Navbar';
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
      showError('GitHub 未配置，请检查环境变量');
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
        throw new Error(err.error ?? '创建失败');
      }

      message.success('联系人创建成功');
      router.push(`/faces/${groupPath}/${safeName}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : t('common.error');
      showError(`创建联系人失败: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  /** 等待鉴权完成 */
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
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
        <Navbar />
        <PageContainer maxWidth="4xl">
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-xl flex items-center justify-center mb-6">
              <Lock size={28} className="text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">需要管理员权限</h2>
            <p className="text-zinc-400 mb-8">此操作仅限超级管理员执行</p>
            <Link href="/faces">
              <Button
                type="default"
                icon={<ArrowLeft size={16} />}
                className="h-10 px-8 rounded-xl"
              >
                返回通讯录
              </Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <PageContainer maxWidth="4xl">
        <div className="flex flex-col gap-3 mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            新建联系人
          </h1>
          <p className="text-sm text-zinc-400">添加新联系人到通讯录</p>
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
              label={<span className="text-zinc-700 font-medium">联系人姓名</span>}
              name="name"
              rules={[{ required: true, message: '请输入联系人姓名' }]}
            >
              <Input
                placeholder="请输入联系人姓名"
                className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-zinc-700 font-medium">分组/标签</span>}
              name="groups"
              extra="可输入多个标签，第一个标签将作为分组目录"
            >
              <Select
                mode="tags"
                placeholder="输入后按回车添加标签"
                className="rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                style={{ minHeight: 40 }}
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-zinc-700 font-medium">描述</span>}
              name="description"
              extra="简短描述，将显示在 Front Matter 中"
            >
              <Input
                placeholder="请输入简短描述（可选）"
                className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-zinc-700 font-medium">详细内容 *</span>}
              name="content"
              rules={[{ required: true, message: '请输入详细内容' }]}
              extra="支持 Markdown 格式"
            >
              <TextArea
                placeholder="使用 Markdown 编写联系人详细内容..."
                className="rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                rows={12}
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </Form.Item>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
              <Link href="/faces">
                <Button
                  type="default"
                  icon={<ArrowLeft size={16} />}
                  className="h-10 px-6 rounded-xl"
                >
                  {t('common.back')}
                </Button>
              </Link>

              <Button
                type="primary"
                htmlType="submit"
                icon={<Save size={16} />}
                loading={submitting}
                className="h-10 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800"
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
