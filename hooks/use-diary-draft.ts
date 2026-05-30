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
  onDraftFound?: (data: DraftData) => void;
}

export function useDiaryDraft({ id, title, content, tags, date, onDraftFound }: UseDiaryDraftOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 将回调函数存入 ref，避免 useEffect 依赖重新创建导致无限循环
  const onDraftFoundRef = useRef(onDraftFound);
  useEffect(() => {
    onDraftFoundRef.current = onDraftFound;
  }, [onDraftFound]);

  const autoSave = useCallback(() => {
    setSaveStatus('saving');
    const data: DraftData = { title, content, tags, date };
    saveLocalDraft(id, data);
    fetch('/api/diary/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, content, tags, date }),
    })
      .then((res) => {
        if (res.ok) {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        } else {
          setSaveStatus('error');
        }
      })
      .catch(() => {
        setSaveStatus('error');
      });
  }, [id, title, content, tags, date]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(autoSave, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoSave]);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const local = loadLocalDraft(id);
    if (local && onDraftFoundRef.current) {
      onDraftFoundRef.current(local);
      return;
    }

    fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) { console.warn('草稿加载失败:', res.status); return null; }
        return res.json();
      })
      .then((json) => {
        if (json?.draft && onDraftFoundRef.current) {
          onDraftFoundRef.current(json.draft);
        }
      })
      .catch((err) => console.warn('草稿加载异常:', err));
  }, [id]);

  function clearDraft() {
    removeLocalDraft(id);
    fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch((err) => console.warn('草稿删除异常:', err));
  }

  return { clearDraft, saveStatus, lastSavedAt };
}
