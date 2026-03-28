'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Save, Send, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams?.get('id');
  const { user } = useAuth();
  const { t, locale } = useI18n();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!articleId);

  useEffect(() => {
    if (articleId) {
      const fetchArticle = async () => {
        setFetching(true);
        try {
          const res = await fetch(`/api/articles/${articleId}`);
          if (res.ok) {
            const data = await res.json();
            setTitle(data.title || '');
            setContent(data.content || '');
            setTags(data.tags?.join(', ') || '');
            setCoverImage(data.coverImage || '');
            setStatus(data.status || 'draft');
          }
        } catch (error) {
          console.error(t('editor.fetchFailed'), error);
        } finally {
          setFetching(false);
        }
      };
      fetchArticle();
    }
  }, [articleId]);

  const handleSave = async (newStatus: string) => {
    if (!user) {
      alert(t('editor.pleaseLogin'));
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert(t('editor.titleContentRequired'));
      return;
    }

    setLoading(true);
    try {
      const articleData = {
        title,
        content,
        status: newStatus,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        coverImage,
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId ? `/api/articles/${articleId}` : '/api/articles';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      if (res.ok) {
        router.push('/dashboard/articles');
      } else {
        alert(t('editor.saveFailed'));
      }
    } catch (error) {
      console.error(t('editor.saveFailed'), error);
      alert(t('editor.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center text-zinc-500">{t('editor.loading')}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/articles" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft size={20} />
          <span>{t('editor.back')}</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleSave('draft')}
            disabled={loading}
            className="lobe-button bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Save size={18} />
            <span>{t('editor.saveDraft')}</span>
          </button>
          <button 
            onClick={() => handleSave('published')}
            disabled={loading}
            className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Send size={18} />
            <span>{t('editor.publish')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <input 
          type="text" 
          placeholder={t('editor.titlePlaceholder')} 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-4xl md:text-5xl font-display font-bold text-zinc-900 bg-transparent border-none outline-none placeholder:text-zinc-300 w-full"
        />
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder={t('editor.coverUrl')} 
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="lobe-input pl-10 w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder={t('editor.tags')} 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="lobe-input w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <textarea 
          placeholder={t('editor.contentPlaceholder')} 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-zinc-800 font-mono text-sm resize-none outline-none focus:border-zinc-400 transition-colors min-h-[500px]"
        />
      </div>
    </div>
  );
}

function EditorLoading() {
  const { t } = useI18n();
  return <div className="p-8 text-center text-zinc-500">{t('editor.loading')}</div>;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent />
    </Suspense>
  );
}
