'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { ArrowLeft } from 'lucide-react';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import Link from 'next/link';
import {
  SaveStatusBadge,
  EditorActions,
  EditorMetaSection,
  EditorBodySection,
  type ArticleFormData,
} from './_components/editor-sections';

/** 根据标题与作者名生成默认文章路径（与 buildSlug 的自动生成规则一致） */
function buildAutoSlug(title: string, name: string): string {
  const base = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '');
  return `/${name}/${base}`;
}

/** 拉取文章详情并归一化为表单数据，失败返回 null */
async function loadArticleForm(articleId: string): Promise<ArticleFormData | null> {
  const res = await fetch(`/api/articles/${articleId}`);
  if (!res.ok) return null;
  const data = await res.json() as Record<string, unknown>;
  return {
    title: (data.title as string) ?? '',
    content: (data.content as string) ?? '',
    tags: ((data.tags as string[]) ?? []).join(', '),
    coverImage: (data.coverImage as string) ?? (data.cover as string) ?? '',
    description: (data.description as string) ?? '',
    slug: (data.slug as string) ?? '',
  };
}

/** 查询 GitHub 配置状态：轻量端点仅返回布尔值。
 *  不用 /api/env-status（root-only）：admin 会被 403 误判为"未配置"而无法发布，
 *  而发布接口本身只需登录——探测接口权限必须 ≤ 发布接口权限 */
async function checkGithubConfig(): Promise<boolean> {
  const res = await fetch('/api/github/status');
  if (!res.ok) throw new Error('github status failed');
  const data = await res.json();
  return !!data.configured;
}

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams?.get('id');
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  // 管理员/超级管理员权限检查（me 接口已归一化角色，root 即最高权限）
  const isAdmin = user?.role === 'admin' || user?.role === 'root';

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isAdmin, router]);

  const [form, setForm] = useState<ArticleFormData>({
    title: '',
    content: '',
    tags: '',
    coverImage: '',
    description: '',
    slug: '',
  });
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fetching, setFetching] = useState(!!articleId);
  const [githubConfigured, setGithubConfigured] = useState(false);
  // 已保存快照（用于检测未保存变更）与最近保存时间
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // 移动端编辑/预览切换
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (articleId) {
      const load = async () => {
        setFetching(true);
        try {
          const loaded = await loadArticleForm(articleId);
          if (!loaded) {
            showError(t('editor.fetchFailed'));
            return;
          }
          setForm(loaded);
          setSavedSnapshot(JSON.stringify(loaded));
        } catch (error) {
          console.error(t('editor.fetchFailed'), error);
          showError(t('editor.fetchFailed'));
        } finally {
          setFetching(false);
        }
      };
      void load();
    }

    // 检查 GitHub 是否配置
    const checkConfig = async () => {
      try {
        setGithubConfigured(await checkGithubConfig());
      } catch {
        showError(t('editor.githubConfigCheckFailed'));
      }
    };
    void checkConfig();
  }, [articleId, t]);

  const setField = (key: keyof ArticleFormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /** 当前表单快照，与 savedSnapshot 比对判断是否有未保存变更 */
  const currentSnapshot = JSON.stringify(form);
  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  /** 字数与预计阅读时长（中文约 400 字/分钟） */
  const charCount = form.content.length;
  const readMinutes = Math.max(1, Math.round(charCount / 400));

  /** slug 为空时自动生成的路径预览 */
  const autoSlugPreview = useMemo(() => {
    if (form.slug || !form.title.trim()) return null;
    return buildAutoSlug(form.title, user?.name ?? 'anonymous');
  }, [form.slug, form.title, user?.name]);

  /** 生成并校验文章 slug */
  function buildSlug(): string | null {
    const postSlug = form.slug || buildAutoSlug(form.title, user?.name ?? 'anonymous');
    if (!/^\/[\w\u4e00-\u9fa5-]+(\/[\w\u4e00-\u9fa5-]+)*$/.test(postSlug)) {
      showError(t('editor.invalidSlug'));
      return null;
    }
    return postSlug;
  }

  /**
   * 保存草稿到数据库（成功后停留本页并记录保存时间，便于继续编辑）
   */
  const handleSaveDraft = async () => {
    if (!user) { message.warning(t('editor.pleaseLogin')); return; }
    if (!form.title.trim() || !form.content.trim()) { message.warning(t('editor.titleContentRequired')); return; }

    setSavingDraft(true);
    try {
      const articleData = {
        title: form.title,
        content: form.content,
        status: 'draft',
        authorId: user.uid,
        authorName: user.displayName || user.name || 'Anonymous',
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        coverImage: form.coverImage,
        description: form.description,
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      if (res.ok) {
        setSavedSnapshot(currentSnapshot);
        setLastSavedAt(new Date());
        message.success(articleId ? t('editor.updateSuccess') : t('editor.saveSuccess'));
      } else {
        const data = await res.json();
        showError(`${t('editor.saveFailed')}: ${data.error ?? ''}`);
      }
    } catch (error) {
      console.error(t('editor.saveFailed'), error);
      showError(t('editor.saveFailed'));
    } finally {
      setSavingDraft(false);
    }
  };

  /**
   * 发布文章：推送到 GitHub posts/ 目录
   */
  const handlePublish = async () => {
    if (!user) { message.warning(t('editor.pleaseLogin')); return; }
    if (!form.title.trim() || !form.content.trim()) { message.warning(t('editor.titleContentRequired')); return; }

    setPublishing(true);
    try {
      const postSlug = buildSlug();
      if (!postSlug) { setPublishing(false); return; }

      const articleData = {
        title: form.title,
        content: form.content,
        status: 'published',
        slug: postSlug,
        authorId: user.uid,
        authorName: user.displayName || user.name || 'Anonymous',
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        coverImage: form.coverImage,
        description: form.description,
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(t('editor.publishSuccess'));
        router.push('/dashboard/articles');
      } else {
        showError(`${t('editor.saveFailed')}: ${data.error ?? ''}`);
      }
    } catch (error) {
      console.error(t('editor.saveFailed'), error);
      showError(`${t('editor.saveFailed')}: ${error instanceof Error ? error.message : ''}`);
    } finally {
      setPublishing(false);
    }
  };

  if (authLoading || fetching) return <GlobalLoading size="large" />;
  if (!user || !isAdmin) return <GlobalLoading size="large" />;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href="/dashboard/articles" className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0">
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">{t('editor.back')}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <SaveStatusBadge isDirty={isDirty} lastSavedAt={lastSavedAt} t={t} />
          <EditorActions
            savingDraft={savingDraft}
            publishing={publishing}
            githubConfigured={githubConfigured}
            onSaveDraft={() => void handleSaveDraft()}
            onPublish={() => void handlePublish()}
            t={t}
          />
        </div>
      </div>

      <EditorMetaSection
        form={form}
        setters={{
          setTitle: setField('title'),
          setSlug: setField('slug'),
          setTags: setField('tags'),
          setCoverImage: setField('coverImage'),
          setDescription: setField('description'),
        }}
        autoSlugPreview={autoSlugPreview}
        t={t}
      />

      <EditorBodySection
        content={form.content}
        onContentChange={setField('content')}
        previewMode={previewMode}
        onModeChange={setPreviewMode}
        charCount={charCount}
        readMinutes={readMinutes}
        t={t}
      />
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <GlobalLoading size="large" />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent />
    </Suspense>
  );
}