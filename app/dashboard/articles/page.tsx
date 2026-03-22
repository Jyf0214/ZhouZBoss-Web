'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Edit, Trash2, Plus, Eye, RotateCcw } from 'lucide-react';
import { Icon, Text } from '@lobehub/ui';

export default function ArticlesPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const isRecycleBin = status === 'pending_deletion';
  
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          // 根据状态过滤
          const filtered = isRecycleBin 
            ? data.filter((a: any) => a.status === 'pending_deletion')
            : data.filter((a: any) => a.status !== 'pending_deletion');
          setArticles(filtered);
        }
      } catch (error) {
        console.error('获取文章列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [user, isRecycleBin]);

  const handleDelete = async (id: string) => {
    const confirmMsg = isRecycleBin 
      ? (locale === 'zh-CN' ? '确定要永久删除这篇文章吗？此操作不可恢复！' : 'Are you sure you want to permanently delete this article? This cannot be undone!')
      : (locale === 'zh-CN' ? '确定要删除这篇文章吗？' : 'Are you sure you want to delete this article?');
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('删除文章失败:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
        alert(locale === 'zh-CN' ? '文章已恢复' : 'Article restored');
      }
    } catch (error) {
      console.error('恢复文章失败:', error);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text style={{ color: 'var(--ant-color-error)' }}>
          {locale === 'zh-CN' ? '请登录后查看文章' : 'Please login to view articles'}
        </Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">{locale === 'zh-CN' ? '加载中...' : 'Loading...'}</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Text fontSize={24} weight={'bold'}>
            {isRecycleBin 
              ? (locale === 'zh-CN' ? '回收站' : 'Recycle Bin')
              : (locale === 'zh-CN' ? '文章管理' : 'Article Management')
            }
          </Text>
          {isRecycleBin && (
            <Text fontSize={14} type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {locale === 'zh-CN' ? '待删除的文章，30天后自动删除' : 'Articles pending deletion, auto-delete after 30 days'}
            </Text>
          )}
        </div>
        {!isRecycleBin && (
          <Link href="/editor" style={{ textDecoration: 'none' }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}>
              <Icon icon={Plus} />
              <span>{locale === 'zh-CN' ? '新建文章' : 'New Article'}</span>
            </button>
          </Link>
        )}
      </div>

      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              background: '#fafafa',
              borderBottom: '1px solid #e5e5e5',
            }}>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>
                {locale === 'zh-CN' ? '标题' : 'Title'}
              </th>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>
                {locale === 'zh-CN' ? '状态' : 'Status'}
              </th>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>
                {locale === 'zh-CN' ? '作者' : 'Author'}
              </th>
              <th style={{ padding: 16, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                {locale === 'zh-CN' ? '操作' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 16 }}>
                  <Text weight={500}>{article.title}</Text>
                </td>
                <td style={{ padding: 16 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    background: article.status === 'published' ? '#f6ffed' 
                      : article.status === 'pending_deletion' ? '#fff1f0'
                      : '#fffbe6',
                    color: article.status === 'published' ? '#52c41a'
                      : article.status === 'pending_deletion' ? '#ff4d4f'
                      : '#faad14',
                  }}>
                    {article.status === 'published' 
                      ? (locale === 'zh-CN' ? '已发布' : 'Published')
                      : article.status === 'pending_deletion'
                        ? (locale === 'zh-CN' ? '待删除' : 'Pending Delete')
                        : (locale === 'zh-CN' ? '草稿' : 'Draft')
                    }
                  </span>
                </td>
                <td style={{ padding: 16 }}>
                  <Text type="secondary">{article.authorName}</Text>
                </td>
                <td style={{ padding: 16, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {isRecycleBin ? (
                      <>
                        <button 
                          onClick={() => handleRestore(article.id)}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#52c41a',
                          }} 
                          title={locale === 'zh-CN' ? '恢复' : 'Restore'}
                        >
                          <Icon icon={RotateCcw} />
                        </button>
                        <button 
                          onClick={() => handleDelete(article.id)}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#ff4d4f',
                          }} 
                          title={locale === 'zh-CN' ? '永久删除' : 'Delete Permanently'}
                        >
                          <Icon icon={Trash2} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href={`/article/${article.id}`}>
                          <button style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#1890ff',
                          }} title={locale === 'zh-CN' ? '查看' : 'View'}>
                            <Icon icon={Eye} />
                          </button>
                        </Link>
                        <Link href={`/editor?id=${article.id}`}>
                          <button style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#52c41a',
                          }} title={locale === 'zh-CN' ? '编辑' : 'Edit'}>
                            <Icon icon={Edit} />
                          </button>
                        </Link>
                        <button 
                          onClick={() => handleDelete(article.id)}
                          style={{ 
                            padding: 8, 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: 6,
                            color: '#ff4d4f',
                          }} title={locale === 'zh-CN' ? '删除' : 'Delete'}
                        >
                          <Icon icon={Trash2} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center' }}>
                  <Text type="secondary">
                    {isRecycleBin 
                      ? (locale === 'zh-CN' ? '回收站为空' : 'Recycle bin is empty')
                      : (locale === 'zh-CN' ? '暂无文章，创建您的第一篇文章吧！' : 'No articles yet, create your first one!')
                    }
                  </Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
