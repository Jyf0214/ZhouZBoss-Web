'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Plus, Search } from 'lucide-react';
import { Input, Tag, Popconfirm, message } from 'antd';
import { GlobalLoading } from '@/components/Loading';
import { showError } from '@/lib/error';
import ProCard from '@/components/ui/ProCard';

interface ArticleItem {
  id: string;
  slug?: string;
  title: string;
  author?: string;
  date?: string;
  tags?: string[];
  cover?: string;
  description?: string;
  status: 'published' | 'draft' | 'pending_deletion';
}

export default function ArticlesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const status = searchParams?.get('status');
  const isRecycleBin = status === 'pending_deletion';

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [operating, setOperating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          const filtered = isRecycleBin
            ? data.filter((a: ArticleItem) => a.status === 'pending_deletion')
            : data.filter((a: ArticleItem) => a.status !== 'pending_deletion');
          setArticles(filtered);
        }
      } catch (error) {
		console.error('获取文章列表失败:', error);
		showError(t('common.error') || '文章列表加载失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchArticles();
  }, [user, isRecycleBin, t]);

  const handleDelete = async (id: string) => {
    setOperating(id);
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
        message.success(t('common.success'));
      }
    } catch {
      showError(t('common.error'));
    } finally {
      setOperating(null);
    }
  };

  const handleRestore = async (id: string) => {
    setOperating(id);
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
        message.success(t('common.success'));
      }
    } catch {
      showError(t('common.error'));
    } finally {
      setOperating(null);
    }
  };

  const filteredArticles = articles.filter(a =>
    !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return <GlobalLoading />;
  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <GlobalLoading size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {isRecycleBin ? t('sidebar.recycleBin') : t('sidebar.articleManagement')}
          </h1>
          {isRecycleBin && (
            <p className="text-zinc-400 text-sm mt-1">
              {t('dashboard.recycleBinHint') || t('dashboard.recycleBinDesc')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
            <Input
              placeholder={t('common.searchArticles') || t('article.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!pl-9 !h-9 !rounded-lg !text-sm"
              size="middle"
              allowClear
            />
          </div>
          {!isRecycleBin && (
            <Link href="/editor">
              <button className="h-9 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1.5">
                <Plus size={14} />
                {t('sidebar.writeArticle')}
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* 文章列表 */}
      <ProCard padding="p-0">
        {filteredArticles.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {filteredArticles.map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                {/* 左侧：标题 + 状态 */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Tag
                    color={
                      article.status === 'published' ? 'success'
                      : article.status === 'pending_deletion' ? 'error'
                      : 'warning'
                    }
                    className="shrink-0 text-xs rounded-md !m-0"
                  >
                    {article.status === 'published'
                      ? t('article.published')
                      : article.status === 'pending_deletion'
                      ? t('article.pendingDeletion')
                      : t('article.draft')}
                  </Tag>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 break-words">{article.title}</div>
                  </div>
                </div>

                {/* 右侧：按钮 */}
                <div className="flex items-center gap-1 shrink-0">
                  {isRecycleBin ? (
                    <>
                      <button
                        onClick={() => handleRestore(article.id)}
                        disabled={operating === article.id}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('common.restore')}
                      </button>
                      <Popconfirm
                        title={t('article.permanentlyDeleteConfirm')}
                        onConfirm={() => handleDelete(article.id)}
                        okText={t('common.delete')}
                        cancelText={t('common.cancel')}
                        okButtonProps={{ danger: true }}
                      >
                        <button disabled={operating === article.id} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {t('common.delete')}
                        </button>
                      </Popconfirm>
                    </>
                  ) : (
                    <>
                      {article.status === 'published' && article.slug && (
                        <Link href={`/posts${article.slug}`}>
                          <button className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg transition-colors">
                            {t('common.view')}
                          </button>
                        </Link>
                      )}
                      <Link href={`/editor?id=${article.id}`}>
                        <button disabled={operating === article.id} className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg transition-colors disabled:opacity-50">
                          {t('common.edit')}
                        </button>
                      </Link>
                      <Popconfirm
                        title={t('article.deleteConfirm')}
                        onConfirm={() => handleDelete(article.id)}
                        okText={t('common.delete')}
                        cancelText={t('common.cancel')}
                        okButtonProps={{ danger: true }}
                      >
                        <button disabled={operating === article.id} className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {t('common.delete')}
                        </button>
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-zinc-400 text-sm">
              {isRecycleBin
                ? t('dashboard.recycleBinEmpty') || '回收站为空'
                : t('dashboard.noArticles')}
            </p>
            {!isRecycleBin && (
              <Link href="/editor" className="mt-4 inline-block">
                <button className="mt-4 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
                  {t('dashboard.writeFirstArticle')}
                </button>
              </Link>
            )}
          </div>
        )}
      </ProCard>
    </div>
  );
}
