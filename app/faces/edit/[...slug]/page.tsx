'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Button, Form, Input, Popconfirm, message, Select } from 'antd';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';
import { editFace, deleteFace } from './actions';
import type { ContentFile } from '@/types/content';
import { GlobalLoading } from '@/components/Loading';
import { Navbar } from '@/components/Navbar';

const { TextArea } = Input;

/** 表单值类型 */
interface FormValues {
  name: string;
  email: string;
  phone: string;
  group: string;
  content: string;
}

/** 分组选项 */
interface GroupOption {
  slug: string;
  title: string;
  groupName: string;
}

export default function EditFacePage() {
  const params = useParams();
  const router = useRouter();
  const { isSudo, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();

  const slugArray = (params?.slug as string[]) || [];
  const fullPath = '/' + slugArray.join('/');
  const filePath = `faces${fullPath}.md`;

  const [file, setFile] = useState<ContentFile | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** 加载联系人数据和分组列表 */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行加载联系人详情和分组列表
        const [faceRes, groupsRes] = await Promise.all([
          fetch(`/api/faces${fullPath}`),
          fetch('/api/faces'),
        ]);

        if (!faceRes.ok) {
          if (faceRes.status === 404) {
            showError('联系人不存在');
            router.push('/faces');
            return;
          }
          throw new Error('加载联系人失败');
        }

        const faceData = await faceRes.json();
        setFile(faceData);

        // 填充表单
        form.setFieldsValue({
          name: String(faceData.meta.name || faceData.meta.title || ''),
          email: String(faceData.meta.email || ''),
          phone: String(faceData.meta.phone || ''),
          group: String(faceData.meta.group || ''),
          content: String(faceData.content || ''),
        });

        // 解析分组列表
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groupOptions: GroupOption[] = (groupsData.indexes || []).map(
            (idx: { slug: string; title: string; groupName?: string }) => ({
              slug: idx.slug,
              title: idx.title,
              groupName: idx.groupName || idx.slug.replace('/', ''),
            })
          );
          setGroups(groupOptions);
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        showError(err instanceof Error ? err.message : '加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fullPath, form, router]);

  /** 权限检查 */
  useEffect(() => {
    if (!authLoading && !isSudo) {
      showError('无权限访问此页面');
      router.push('/faces');
    }
  }, [isSudo, authLoading, router]);

  /** 提交表单 */
  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const result = await editFace({
        oldPath: filePath,
        name: values.name,
        email: values.email,
        phone: values.phone,
        group: values.group,
        content: values.content,
      });

      message.success(result.message);
      router.push(`/faces${result.newSlug}`);
    } catch (err) {
      console.error('提交失败:', err);
      showError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 删除联系人 */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteFace(filePath);
      message.success(result.message);
      router.push('/faces');
    } catch (err) {
      console.error('删除失败:', err);
      showError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  /** 加载状态 */
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <GlobalLoading size="large" />
        </div>
      </div>
    );
  }

  /** 无权限或文件不存在 */
  if (!isSudo || !file) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8 flex-wrap">
          <Link
            href="/faces"
            className="hover:text-zinc-900 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            {t('nav.faces')}
          </Link>
          <span>/</span>
          <Link
            href={`/faces${fullPath}`}
            className="hover:text-zinc-900 transition-colors"
          >
            {file.meta.title}
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">编辑</span>
        </nav>

        {/* 页面标题 */}
        <div className="flex flex-col gap-3 mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            编辑联系人
          </h1>
          <p className="text-sm text-zinc-400">修改 {file.meta.title} 的信息</p>
        </div>

        {/* 表单容器 */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="space-y-6"
          >
            {/* 姓名和邮箱 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                label={
                  <span className="text-zinc-700 font-medium">
                    {t('auth.username')} *
                  </span>
                }
                name="name"
                rules={[{ required: true, message: t('validation.required') }]}
              >
                <Input
                  placeholder={t('auth.usernamePlaceholder')}
                  className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-zinc-700 font-medium">
                    {t('auth.email')}
                  </span>
                }
                name="email"
                rules={[
                  { type: 'email', message: t('validation.emailInvalid') },
                ]}
              >
                <Input
                  placeholder={t('auth.inputEmailPlaceholder')}
                  className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                />
              </Form.Item>
            </div>

            {/* 电话和分组 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                label={
                  <span className="text-zinc-700 font-medium">
                    {t('article.phone') || 'Phone'}
                  </span>
                }
                name="phone"
              >
                <Input
                  placeholder={t('article.phonePlaceholder') || 'Phone'}
                  className="h-10 rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-zinc-700 font-medium">
                    {t('faces.groupName')} *
                  </span>
                }
                name="group"
                rules={[{ required: true, message: t('validation.required') }]}
              >
                <Select
                  placeholder={t('faces.groupName')}
                  className="h-10 rounded-lg text-sm"
                  options={groups.map((group) => ({
                    value: group.groupName,
                    label: group.title || group.groupName,
                  }))}
                />
              </Form.Item>
            </div>

            {/* 详细内容 */}
            <Form.Item
              label={
                <span className="text-zinc-700 font-medium">
                  {t('article.content')}
                </span>
              }
              name="content"
            >
              <TextArea
                placeholder={t('editor.contentPlaceholder')}
                className="rounded-lg text-sm border-zinc-200 hover:border-zinc-300 focus:border-zinc-900"
                autoSize={{ minRows: 6 }}
                style={{ fontFamily: 'inherit', resize: 'vertical' }}
              />
            </Form.Item>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
              <Link href={`/faces${fullPath}`}>
                <Button
                  type="default"
                  icon={<ArrowLeft size={16} />}
                  className="h-10 px-6 rounded-xl"
                >
                  {t('common.back')}
                </Button>
              </Link>

              <div className="flex gap-3">
                <Popconfirm
                  title={t('common.confirm')}
                  description="确定要删除此联系人吗？此操作不可撤销。"
                  onConfirm={handleDelete}
                  okText={t('common.confirm')}
                  cancelText={t('common.cancel')}
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="default"
                    danger
                    icon={<Trash2 size={16} />}
                    loading={deleting}
                    className="h-10 px-6 rounded-xl"
                  >
                    {t('common.delete')}
                  </Button>
                </Popconfirm>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<Save size={16} />}
                  loading={submitting}
                  className="h-10 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800"
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-zinc-100 py-12 bg-zinc-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-400 text-sm font-medium">Originium Kernel</p>
        </div>
      </footer>
    </div>
  );
}
