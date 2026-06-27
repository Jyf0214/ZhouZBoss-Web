'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { showError } from '@/lib/error';
import { useDiaryDraft } from '@/hooks/use-diary-draft';
import { PageContainer } from '@/components/ui/PageContainer';

interface DiaryFormProps {
  mode: 'new' | 'edit';
  draftId: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialGroup?: string;
  initialDate?: string;
  onSave: (title: string, content: string, tags: string[], date: string, group?: string) => Promise<string | null>;
}

export default function DiaryForm({ mode: _mode, draftId, initialTitle, initialContent, initialTags, initialGroup, initialDate, onSave }: DiaryFormProps) {
  const [title, setTitle] = React.useState(initialTitle ?? '');
  const [content, setContent] = React.useState(initialContent ?? '');
  const [tags, setTags] = React.useState((initialTags ?? []).join(', '));
  const [diaryGroup, setDiaryGroup] = React.useState(initialGroup ?? '默认');
  const [diaryDate, setDiaryDate] = React.useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const [recovered, setRecovered] = React.useState(false);
  const [nowTick, setNowTick] = React.useState(Date.now());
  const [lastSavedSnapshot, setLastSavedSnapshot] = React.useState({ title: initialTitle ?? '', content: initialContent ?? '', tags: (initialTags ?? []).join(', '), group: initialGroup ?? '默认', date: initialDate ?? new Date().toISOString().slice(0, 10) });
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
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
    group: diaryGroup,
    date: diaryDate,
    onDraftFound: (data) => {
      if (!recovered && (data.title || data.content)) {
        const ok = window.confirm(`检测到上次未完成的草稿（${data.savedAt ? new Date(data.savedAt).toLocaleString('zh-CN') : '未知时间'}），是否恢复？`);
        if (ok) {
          setTitle(data.title ?? '');
          setContent(data.content ?? '');
          setTags((data.tags ?? []).join(', '));
          if (data.group) setDiaryGroup(data.group);
          if (data.date) setDiaryDate(data.date.slice(0, 10));
          setRecovered(true);
        }
      }
    },
  });

  // 保存成功后同步快照，防止 beforeunload 误报
  React.useEffect(() => {
    if (saveStatus === 'saved') {
      setLastSavedSnapshot({ title, content, tags, group: diaryGroup, date: diaryDate });
    }
  }, [saveStatus, title, content, tags, diaryGroup, diaryDate]);

  // 表单有未保存变更时阻止意外离开
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [hasUnsavedChanges]);

  // 草稿恢复后同步快照，避免误报未保存变更
  React.useEffect(() => {
    if (recovered && (title || content)) {
      setLastSavedSnapshot({ title, content, tags, group: diaryGroup, date: diaryDate });
    }
  }, [recovered]); // eslint-disable-line react-hooks/exhaustive-deps

  // 追踪是否有未保存变更
  React.useEffect(() => {
    setHasUnsavedChanges(
      title !== lastSavedSnapshot.title ||
      content !== lastSavedSnapshot.content ||
      tags !== lastSavedSnapshot.tags ||
      diaryGroup !== lastSavedSnapshot.group ||
      diaryDate !== lastSavedSnapshot.date
    );
  }, [title, content, tags, diaryGroup, diaryDate, lastSavedSnapshot]);

  const handleSave = async () => {
    if (!title.trim()) { showError('请输入标题'); return; }
    if (!content.trim()) { showError('请输入内容'); return; }

    setSaving(true);
    try {
      const tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await onSave(title.trim(), content.trim(), tagsArr, diaryDate, diaryGroup);
      if (result !== null) {
        setLastSavedSnapshot({ title: title.trim(), content: content.trim(), tags: tagsArr.join(', '), group: diaryGroup, date: diaryDate });
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
          <Button onClick={() => router.push('/diary')} variant="ghost" size="sm" autoLoading={false} icon={<ArrowLeft size={16}/>}>返回</Button>
          <Button onClick={handleSave} loading={saving} variant="primary" size="md">保存</Button>
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
                <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
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
            value={diaryGroup}
            onChange={(e) => setDiaryGroup(e.target.value)}
            placeholder="分类（如：生活, 工作, 技术）"
            className="w-full text-sm text-zinc-500 placeholder-zinc-300 bg-transparent border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all"
          />
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
