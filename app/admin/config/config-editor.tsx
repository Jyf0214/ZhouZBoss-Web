'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Settings, Save } from 'lucide-react';
import GitHubStatus from '@/components/ui/GitHubStatus';
import ConfigFormBody from './config-form-body';
import type { ConfigState } from './config-builders';

function ConfigPageHeader({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
        <Settings size={18} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('config.title')}</h1>
        <p className="text-sm text-zinc-400">{t('config.subtitle')}</p>
      </div>
    </div>
  );
}

function RemoteFetchErrorAlert({ error }: { error: string }) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-red-800">无法拉取远程配置文件</h2>
          <p className="text-sm text-red-600">
            无法从 GitHub 读取 config.yaml，请检查仓库权限和令牌配置
          </p>
        </div>
      </div>
      <div className="bg-red-100/50 rounded-xl p-4 font-mono text-xs text-red-700 whitespace-pre-wrap break-all">
        {error || '未知错误'}
      </div>
      <p className="mt-3 text-xs text-red-500">
        保存功能暂时不可用，请修复后刷新页面重试
      </p>
    </div>
  );
}

function SaveButton({
  saving,
  githubConfigured,
  remoteFetchFailed,
  onSave,
}: {
  saving: boolean;
  githubConfigured: boolean;
  remoteFetchFailed: boolean;
  onSave: () => void;
}) {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Button
        variant="primary"
        rounded="full"
        size="lg"
        iconOnly
        icon={<Save size={18} />}
        onClick={onSave}
        loading={saving}
        disabled={!githubConfigured || remoteFetchFailed}
        className="shadow-lg"
      />
    </div>
  );
}

export default function ConfigEditor({
  config,
  onConfigChange,
  t,
  githubConfigured,
  remoteConfigStatus,
  remoteConfigError,
  saving,
  DiffModal,
  onSave,
}: {
  config: ConfigState;
  onConfigChange: (config: ConfigState) => void;
  t: (key: string) => string;
  githubConfigured: boolean;
  remoteConfigStatus: string;
  remoteConfigError: string;
  saving: boolean;
  DiffModal: React.ReactNode;
  onSave: () => void;
}) {
  const remoteFetchFailed = !!(remoteConfigStatus === 'error' && githubConfigured);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-4">
        <ConfigPageHeader t={t} />

        {remoteFetchFailed && (
          <RemoteFetchErrorAlert error={remoteConfigError} />
        )}

        <ConfigFormBody config={config} onConfigChange={onConfigChange} t={t} />

        <GitHubStatus
          configured={githubConfigured}
          configuredText="已配置，将保存到 GitHub"
          notConfiguredText="未配置（请设置 GITHUB_REPO 和 GITHUB_TOKEN）"
        />

        {DiffModal}
      </div>

      <SaveButton
        saving={saving}
        githubConfigured={githubConfigured}
        remoteFetchFailed={remoteFetchFailed}
        onSave={onSave}
      />
    </div>
  );
}
