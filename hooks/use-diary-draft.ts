'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

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
    timerRef.current = setTimeout(autoSave, 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoSave]);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const local = loadLocalDraft(id);
    if (local && onDraftFound) {
      onDraftFound(local);
      return;
    }

    fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.draft && onDraftFound) {
          onDraftFound(json.draft);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function clearDraft() {
    removeLocalDraft(id);
    fetch(`/api/diary/draft?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
  }

  return { clearDraft, saveStatus, lastSavedAt };
}
