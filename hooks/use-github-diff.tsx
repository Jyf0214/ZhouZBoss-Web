'use client';

import { useState, useCallback } from 'react';
import { GitHubDiffModal } from '@/components/GitHubDiff';

interface UseGitHubDiffOptions {
  repo: string;
}

interface DiffParams {
  filePath: string;
  oldContent: string;
  newContent: string;
  onSubmit: () => Promise<void>;
}

export function useGitHubDiff({ repo }: UseGitHubDiffOptions) {
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
      // onSuccess 由 onSubmit 内部处理，这里不再重复调用
    } catch (error) {
      // onError 由 onSubmit 内部处理，这里仅做日志
      console.error('[GitHubDiff] 提交失败:', error);
    } finally {
      setLoading(false);
    }
  }, [modalData, hideDiff]);

  const DiffModal = modalData ? (
    <GitHubDiffModal
      filePath={modalData.filePath}
      repo={repo}
      oldContent={modalData.oldContent}
      newContent={modalData.newContent}
      onConfirm={handleConfirm}
      onCancel={hideDiff}
      loading={loading}
      open={true}
    />
  ) : null;

  return {
    showDiff,
    hideDiff,
    DiffModal,
  };
}

export default useGitHubDiff;