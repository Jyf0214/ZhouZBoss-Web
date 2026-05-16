'use client';

import { useCallback } from 'react';
import { useGitHubDiff } from '@/hooks/use-github-diff';
import yaml from 'js-yaml';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';

export interface UseGitHubConfigSyncOptions {
  repo: string;
  remoteConfig: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentConfig: any;
  managedFields?: string[];
  /**
   * 自定义字段合并函数。
   * 当提供时，覆盖 managedFields 的默认合并行为，
   * 用于需要非标准字段映射的场景（如头像更新 users[uid].avatar）。
   */
  customTransform?: (
    remoteObj: Record<string, unknown>,
    currentConfig: Record<string, unknown>,
  ) => Record<string, unknown>;
  onSyncStart?: () => void;
  onSyncComplete?: (yamlContent: string) => void;
  onSyncError?: (error: unknown) => void;
}

export function useGitHubConfigSync({
  repo,
  remoteConfig,
  currentConfig,
  managedFields = ['site', 'appearance', 'access', 'auth'],
  customTransform,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: UseGitHubConfigSyncOptions) {
  const { showDiff, DiffModal } = useGitHubDiff({ repo });
  const { t } = useI18n();

  /**
   * 保存配置到 GitHub。
   * @param initialConfig 初始配置（用于变更检测）
   * @param remoteConfigOverride 可选：运行时覆盖 remoteConfig，用于需要动态获取远程配置的场景
   * @param commitMessage 可选：自定义 Git 提交信息
   * @param repoOverride 可选：运行时覆盖 repo，用于 settings 页等场景
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = useCallback((initialConfig: any, remoteConfigOverride?: string, commitMessage?: string, repoOverride?: string) => {
    const effectiveRepo = repoOverride || repo;
    if (!effectiveRepo) {
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

    const effectiveRemoteConfig = remoteConfigOverride ?? remoteConfig;

    let remoteObj: Record<string, unknown> = {};
    if (effectiveRemoteConfig) {
      try {
        remoteObj = (yaml.load(effectiveRemoteConfig) || {}) as Record<string, unknown>;
      } catch {
        remoteObj = {};
      }
    }

    let merged: Record<string, unknown>;
    if (customTransform) {
      merged = customTransform(remoteObj, currentConfig as Record<string, unknown>);
    } else {
      merged = { ...remoteObj };
      for (const key of managedFields) {
        if (key in currentConfig) {
          merged[key] = (currentConfig as Record<string, unknown>)[key];
        }
      }
    }

    const yamlContent = yaml.dump(merged, { lineWidth: -1 });

    showDiff({
      filePath: 'config.yaml',
      oldContent: effectiveRemoteConfig,
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
              message: commitMessage || 'chore: update config from admin panel',
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
  }, [repo, remoteConfig, currentConfig, managedFields, customTransform, showDiff, t, onSyncStart, onSyncComplete, onSyncError]);

  return { handleSave, DiffModal };
}
