'use client';

import { useCallback } from 'react';
import { useGitHubDiff } from '@/hooks/use-github-diff';
import yaml from 'js-yaml';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';

interface UseGitHubConfigSyncOptions {
  repo: string;
  remoteConfig: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentConfig: any;
  managedFields?: string[];
  onSyncStart?: () => void;
  onSyncComplete?: (yamlContent: string) => void;
  onSyncError?: (error: unknown) => void;
}

export function useGitHubConfigSync({
  repo,
  remoteConfig,
  currentConfig,
  managedFields = ['site', 'appearance', 'access', 'auth'],
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: UseGitHubConfigSyncOptions) {
  const { showDiff, DiffModal } = useGitHubDiff({ repo });
  const { t } = useI18n();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = useCallback((initialConfig: any) => {
    if (!repo) {
      message.error('GitHub 未配置');
      return;
    }
    if (!initialConfig) {
      message.error('初始配置未加载');
      return;
    }
    if (JSON.stringify(initialConfig) === JSON.stringify(currentConfig)) {
      message.info('没有需要保存的变更');
      return;
    }

    let remoteObj: Record<string, unknown> = {};
    if (remoteConfig) {
      try {
        remoteObj = (yaml.load(remoteConfig) || {}) as Record<string, unknown>;
      } catch {
        remoteObj = {};
      }
    }

    const merged = { ...remoteObj };
    for (const key of managedFields) {
      if (key in currentConfig) {
        merged[key] = (currentConfig as Record<string, unknown>)[key];
      }
    }

    const yamlContent = yaml.dump(merged, { lineWidth: -1 });

    showDiff({
      filePath: 'config.yaml',
      oldContent: remoteConfig,
      newContent: yamlContent,
      onSubmit: async () => {
        onSyncStart?.();
        try {
          const res = await fetch('/api/github/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'config-yaml',
              content: yamlContent,
              message: 'chore: update config from admin panel',
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '同步失败');
          }
          message.success(t('config.saveSuccess') || '配置已成功保存至 GitHub');
          onSyncComplete?.(yamlContent);
        } catch (error) {
          showError(`${t('config.saveFailed') || '保存失败'}: ${error instanceof Error ? error.message : '未知错误'}`);
          onSyncError?.(error);
          throw error;
        }
      },
    });
  }, [repo, remoteConfig, currentConfig, managedFields, showDiff, t, onSyncStart, onSyncComplete, onSyncError]);

  return { handleSave, DiffModal };
}
