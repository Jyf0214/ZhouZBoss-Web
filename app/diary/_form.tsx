'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { showError } from '@/lib/error';
import { useDiaryDraft } from '@/hooks/use-diary-draft';
import { PageContainer } from '@/components/ui/PageContainer';

interface DiaryFormProps {
  mode: 'new' | 'edit';
  draftId: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialDate?: string;
  onSave: (title: string, content: string, tags: string[], date: string) => Promise<string | null>;
}

export default function DiaryForm({ mode: _mode, draftId, initialTitle, initialContent, initialTags, initialDate, onSave }: DiaryFormProps) {
  const [title, setTitle] = React.useState(initialTitle ?? '');
  const [content, setContent] = React.useState(initialContent ?? '');
  const [tags, setTags] = React.useState((initialTags ?? []).join(', '));
  const [diaryDate, setDiaryDate] = React.useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const [recovered, setRecovered] = React.useState(false);
  const [nowTick, setNowTick] = React.useState(Date.now());
  const router = useRouter();

  React.useEffect(() => {
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const { clearDraft, saveStatus, lastSavedAt } = useDiaryDraft({
    id: draftId,
    title,
    content,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    date: diaryDate,
    onDraftFound: (data) => {
      if (!recovered && (data.title || data.content)) {
        const ok = window.confirm(`检测到上次未完成的草稿（${data.savedAt ? new Date(data.savedAt).toLocaleString('zh-CN') : '未知时间'}），是否恢复？`);
        if (ok) {
          setTitle(data.title ?? '');
          setContent(data.content ?? '');
          setTags((data.tags ?? []).join(', '));
          if (data.date) setDiaryDate(data.date.slice(0, 10));
          setRecovered(true);
        }
      }
    },
  });

  const handleSave = async () => {
    if (!title.trim()) { showError('请输入标题'); return; }
    if (!content.trim()) { showError('请输入内容'); return; }

    setSaving(true);
    try {
      const tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await onSave(title.trim(), content.trim(), tagsArr, diaryDate);
      if (result !== null) {
        clearDraft();
        router.push('/diary');
      }
    } catch {
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  function agoLabel(): string {
    if (!lastSavedAt) return '';
    const secs = Math.floor((nowTick - lastSavedAt.getTime()) / 1000);
    if (secs < 5) return '刚刚保存';
    if (secs < 60) return `${secs}秒前保存`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}分钟前保存`;
    return `${Math.floor(mins / 60)}小时前保存`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/diary')}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={16} className="sm:size-[18]" />
            <span className="hidden sm:inline">返回日记列表</span>
            <span className="sm:hidden">返回</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : '保存'}
          </button>
        </div>
      </div>

      <PageContainer maxWidth="4xl" padding="compact">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={diaryDate}
              onChange={(e) => setDiaryDate(e.target.value)}
              className="flex-1 text-base sm:text-lg text-zinc-600 bg-transparent border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all"
            />
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-zinc-400">
              {saveStatus === 'saving' && (
                <><div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /><span>保存中...</span></>
              )}
              {saveStatus === 'saved' && (
                <><Cloud size={14} className="text-green-500" /><span>{agoLabel() || '已保存'}</span></>
              )}
              {saveStatus === 'error' && (
                <><CloudOff size={14} className="text-red-400" /><span>保存失败</span></>
              )}
            </div>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="日记标题"
            className="w-full text-2xl sm:text-4xl font-display font-black tracking-tighter text-zinc-900 placeholder-zinc-300 bg-transparent border-none outline-none focus:outline-none"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（逗号分隔，如：生活, 工作, 随笔）"
            className="w-full text-sm text-zinc-400 placeholder-zinc-300 bg-transparent border-none outline-none focus:outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的日记..."
            rows={18}
            className="w-full text-sm sm:text-base text-zinc-900 placeholder-zinc-300 bg-transparent border-none outline-none focus:outline-none resize-y font-mono leading-relaxed"
          />
        </div>
      </PageContainer>
    </div>
  );
}
