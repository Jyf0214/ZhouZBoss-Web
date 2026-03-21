'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Edit, Trash2, Plus, Eye } from 'lucide-react';

export default function ArticlesPage() {
  const { user } = useAuth();
  const [articles] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // TODO: 实现获取文章列表的 API 调用
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    console.log('Delete article:', id);
    // TODO: 实现删除文章逻辑
  };

  if (!user) {
    return <div className="p-8 text-center text-red-500 font-bold">Please log in to view articles.</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold text-zinc-900">Manage Articles</h1>
        <Link 
          href="/editor" 
          className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
        >
          <Plus size={18} />
          <span>New Article</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Author</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-zinc-900 line-clamp-1">{article.title}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      article.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-600">{article.authorName}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/article/${article.id}`}
                        className="p-2 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="View"
                      >
                        <Eye size={18} />
                      </Link>
                      <Link 
                        href={`/editor?id=${article.id}`}
                        className="p-2 text-zinc-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500 font-medium">
                    No articles found. Create your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
