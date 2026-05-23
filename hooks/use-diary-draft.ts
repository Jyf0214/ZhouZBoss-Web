'use client';

import { useEffect, useRef, useCallback } from 'react';

const LS_KEY_PREFIX = 'diary:draft:';

interface DraftData {
  title: string;
  content: string;
  tags: string[];
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

export interface UseDiaryDraftOptions {
  id: string;
  title: string;
  content: string;
  tags: string[];
  onDraftFound?: (data: DraftData) => void;
}

export function useDiaryDraft({ id, title, content, tags, onDraftFound }: UseDiaryDraftOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedRef = useRef(false);

  const autoSave = useCallback(() => {
    const data: DraftData = { title, content, tags };
    saveLocalDraft(id, data);
    fetch('/api/diary/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, content, tags }),
    }).catch(() => undefined);
  }, [id, title, content, tags]);

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

  return { clearDraft };
}
