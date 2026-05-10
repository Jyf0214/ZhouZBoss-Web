'use client';

import { useState, useCallback } from 'react';
import { GitHubDiffModal } from '@/components/GitHubDiff';

interface UseGitHubDiffOptions {
  repo: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface DiffParams {
  filePath: string;
  oldContent: string;
  newContent: string;
  onSubmit: () => Promise<void>;
}

export function useGitHubDiff({ repo, onSuccess, onError }: UseGitHubDiffOptions) {
  const [modalData, setModalData] = useState<DiffParams | null>(null);
  const [loading, setLoading] = useState(false);

  const showDiff = useCallback((params: DiffParams) => {
    setModalData(params);
  }, []);

  const hideDiff = useCallback(() => {
    setModalData(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!modalData) return;
    setLoading(true);
    try {
      await modalData.onSubmit();
      hideDiff();
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('同步失败'));
    } finally {
      setLoading(false);
    }
  }, [modalData, hideDiff, onSuccess, onError]);

  return {
    showDiff,
    hideDiff,
    DiffModal: (
      <GitHubDiffModal
        filePath={modalData?.filePath || ''}
        repo={repo}
        oldContent={modalData?.oldContent || ''}
        newContent={modalData?.newContent || ''}
        onConfirm={handleConfirm}
        onCancel={hideDiff}
        loading={loading}
      />
    ),
  };
}

export default useGitHubDiff;