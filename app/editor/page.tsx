'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { syncArticleToGithub } from '@/lib/github';
import { Save, Send, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id');
  const { user } = useAuth();
  
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
        // TODO: 从 GitHub 或 Redis 获取文章内容
        console.log('Fetching article:', articleId);
        setFetching(false);
      };
      fetchArticle();
    }
  }, [articleId]);

  const handleSave = async (newStatus: string) => {
    if (!user) {
      alert('Please login first.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required.');
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
        updatedAt: new Date().toISOString(),
      };

      console.log('Saving article:', articleData);

      // TODO: 实现基于 Node Function 的保存逻辑
      // 1. 提交至 GitHub
      // 2. 更新 Redis 索引

      // Sync to GitHub if published
      if (newStatus === 'published') {
        try {
          // TODO: 从 config.yaml 获取配置
          const githubRepo = ''; 
          const githubToken = '';
          
          if (githubRepo && githubToken) {
            await syncArticleToGithub(githubRepo, githubToken, { id: articleId || 'new', ...articleData, createdAt: new Date().toISOString() } as any);
          }
        } catch (syncError) {
          console.error('GitHub sync failed:', syncError);
        }
      }

      router.push('/dashboard/articles');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save article.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center text-zinc-500">Loading editor...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/articles" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft size={20} />
          <span>Back to Articles</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleSave('draft')}
            disabled={loading}
            className="lobe-button bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Save size={18} />
            <span>Save Draft</span>
          </button>
          <button 
            onClick={() => handleSave('published')}
            disabled={loading}
            className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Send size={18} />
            <span>Publish</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <input 
          type="text" 
          placeholder="Article Title..." 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-4xl md:text-5xl font-display font-bold text-zinc-900 bg-transparent border-none outline-none placeholder:text-zinc-300 w-full"
        />
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Cover Image URL (optional)" 
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="lobe-input pl-10 w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Tags (comma separated)" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="lobe-input w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <textarea 
          placeholder="Write your article content here in Markdown..." 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-zinc-800 font-mono text-sm resize-none outline-none focus:border-zinc-400 transition-colors min-h-[500px]"
        />
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
