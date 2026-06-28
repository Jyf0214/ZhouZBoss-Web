'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/** 草稿每 2 秒自动保存的防抖间隔 */
const AUTOSAVE_DEBOUNCE_MS = 2000;

const LS_KEY_PREFIX = 'diary:draft:';

interface DraftData {
  title: string;
  content: string;
  tags: string[];
  date?: string;
  group?: string;
  savedAt?: string;
}

function loadLocalDraft(id: string): DraftData | null {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalDraft(id: string, data: DraftData): void {
  try {
    localStorage.setItem(LS_KEY_PREFIX + id, JSON.stringify(data));
  } catch {}
}

function removeLocalDraft(id: string): void {
  try {
    localStorage.removeItem(LS_KEY_PREFIX + id);
  } catch {}
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseDiaryDraftOptions {
  id: string;
  title: string;
  content: string;
  tags: string[];
  date?: string;
  group?: string;
  onDraftFound?: (data: DraftData) => void;
}

export function useDiaryDraft({ id, title, content, tags, date, group, onDraftFound }: UseDiaryDraftOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedIdRef = useRef<string | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // 用 ref 保存最新 props，避免依赖变化导致定时器不断重置
  const propsRef = useRef({ id, title, content, tags, date, group });
  // 将 tags 序列化为稳定字符串，避免数组引用变化导致 effect 无限触发
  const tagsKey = JSON.stringify(tags);
  propsRef.current = { id, title, content, tags, date, group };

  // 将回调函数存入 ref，避免 useEffect 依赖重新创建导致无限循环
  const onDraftFoundRef = useRef(onDraftFound);
  useEffect(() => {
    onDraftFoundRef.current = onDraftFound;
  }, [onDraftFound]);

  const doSave = useCallback(() => {
    const p = propsRef.current;
    // 不保存空内容
    if (!p.title && !p.content) return;

    // 取消上一次未完成的保存请求
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaveStatus('saving');
    const data: DraftData = { title: p.title, content: p.content, tags: p.tags, date: p.date, group: p.group };
    saveLocalDraft(p.id, data);
    fetch('/api/diary/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, title: p.title, content: p.content, tags: p.tags, date: p.date, group: p.group }),
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        } else {
          setSaveStatus('error');
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setSaveStatus('error');
        }
      });
  }, []);

  // 防抖自动保存：title/content/tags/date/group 任一变化时重置定时器
  useEffect(() => {
    if (!title && !content && !tagsKey && !date && !group) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, content, tagsKey, date, group, doSave]);

  // 页面/标签页隐藏时立即保存
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && (title || content || tagsKey || date || group)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        doSave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [title, content, tagsKey, date, group, doSave]);

  useEffect(() => {
    if (lastCheckedIdRef.current === id) return;
    lastCheckedIdRef.current = id;

    const local = loadLocalDraft(id);
    if (local && onDraftFoundRef.current) {
      onDraftFoundRef.current(local);
      return;
    }

    // 取消上一次加载请求
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) { console.warn('草稿加载失败:', res.status); return null; }
        return res.json();
      })
      .then((json) => {
        if (json?.draft && onDraftFoundRef.current) {
          onDraftFoundRef.current(json.draft);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('草稿加载异常:', err);
        }
      });

    return () => { controller.abort(); };
  }, [id]);

  function clearDraft() {
    removeLocalDraft(id);
    fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch((err) => console.warn('草稿删除异常:', err));
  }

  return { clearDraft, saveStatus, lastSavedAt };
}
