'use client';

import { useCallback } from 'react';
import { useGitHubDiff } from '@/hooks/use-github-diff';
import yaml from 'js-yaml';
import { message } from 'antd';
import { showError } from '@/lib/error';
import { useI18n } from '@/hooks/use-i18n';

export interface UseGitHubConfigSyncOptions {
  repo: string;
  githubConfigured?: boolean;
  remoteConfig: string;
  currentConfig: Record<string, unknown>;
  managedFields?: string[];
  /**
   * 自定义字段合并函数。
   * 当提供时，覆盖 managedFields 的默认合并行为，
   * 用于需要非标准字段映射的场景（如头像更新 auth.admin.avatar）。
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
  githubConfigured,
  remoteConfig,
  currentConfig,
  managedFields = ['site', 'appearance', 'access', 'auth'],
  customTransform,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: UseGitHubConfigSyncOptions) {
  const { showDiff, DiffModal } = useGitHubDiff({ repo: repo || (githubConfigured ? 'GitHub' : '') });
  const { t } = useI18n();

  /**
   * 保存配置到 GitHub。
   * @param initialConfig 初始配置（用于变更检测）
   * @param remoteConfigOverride 可选：运行时覆盖 remoteConfig，用于需要动态获取远程配置的场景
   * @param commitMessage 可选：自定义 Git 提交信息
   * @param repoOverride 可选：运行时覆盖 repo，用于 settings 页等场景
   */
  const handleSave = useCallback((initialConfig: Record<string, unknown>, remoteConfigOverride?: string, commitMessage?: string, repoOverride?: string, currentConfigOverride?: Record<string, unknown>) => {
    const effectiveRepo = repoOverride ?? repo;
    if (!effectiveRepo && !githubConfigured) {
      message.error(t('config.githubNotConfigured'));
      return;
    }
    if (!initialConfig) {
      message.error(t('config.initialConfigNotLoaded'));
      return;
    }
    const effectiveConfig = currentConfigOverride ?? currentConfig;
    if (JSON.stringify(initialConfig) === JSON.stringify(effectiveConfig)) {
      message.info(t('config.noChangesToSave'));
      return;
    }

    const effectiveRemoteConfig = remoteConfigOverride ?? remoteConfig;

    let remoteObj: Record<string, unknown> = {};
    if (effectiveRemoteConfig) {
      try {
        remoteObj = (yaml.load(effectiveRemoteConfig) ?? {}) as Record<string, unknown>;
      } catch (err) {
        // 远端 config.yaml 解析失败必须阻断保存：
        // 若降级为空对象继续合并，会把远端所有非托管字段静默抹掉
        showError(`${t('config.remoteParseFailed')}: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }

    let merged: Record<string, unknown>;
    if (customTransform) {
      merged = customTransform(remoteObj, effectiveConfig);
    } else {
      merged = { ...remoteObj };
      for (const key of managedFields) {
        if (key in effectiveConfig) {
          merged[key] = effectiveConfig[key];
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
              message: commitMessage ?? 'chore: update config from admin panel',
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? t('config.syncFailed'));
          }
          message.success(t('config.saveSuccess'));
          onSyncComplete?.(yamlContent);
        } catch (error) {
          showError(`${t('config.saveFailed')}: ${error instanceof Error ? error.message : t('config.unknownError')}`);
          onSyncError?.(error);
          throw error;
        }
      },
    });
  }, [repo, githubConfigured, remoteConfig, currentConfig, managedFields, customTransform, showDiff, t, onSyncStart, onSyncComplete, onSyncError]);

  return { handleSave, DiffModal };
}
