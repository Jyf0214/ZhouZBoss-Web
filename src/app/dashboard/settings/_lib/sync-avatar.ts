import { message } from 'antd';
import { getTranslate } from '@/i18n/translate';
import type { RemoteConfigData } from './types';

export interface SyncAvatarChangesArgs {
  githubConfigured: boolean;
  originalAvatar: string;
  newAvatar: string;
  userName: string;
  syncAvatar: (
    initial: Record<string, unknown>,
    remote: string,
    commitMessage: string,
    repo: string,
    currentConfigOverride?: Record<string, unknown>,
  ) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * 同步头像变更到 GitHub 配置：通过 boolean 校验 GitHub 是否已配置，
 * 然后拉取远程配置，通过 useGitHubConfigSync 的 DiffModal 让用户确认提交。
 * 仓库名由后端从 process.env.GITHUB_REPO 读取，前端不传递。
 */
export async function syncAvatarChanges({
  githubConfigured,
  originalAvatar,
  newAvatar,
  userName,
  syncAvatar,
  setLoading,
}: SyncAvatarChangesArgs): Promise<void> {
  if (!githubConfigured) {
    message.error(getTranslate('settings.avatarSync.githubNotConfigured'));
    return;
  }
  const configRes = await fetch('/api/config');
  if (!configRes.ok) throw new Error(getTranslate('settings.avatarSync.configReadFailed'));
  const configResData: RemoteConfigData = await configRes.json();
  const remoteRaw = configResData._remoteConfig ?? '';
  // 远端拉取失败时 _remoteConfig 为空串：若继续提交，合并基线退化为空对象，
  // 远程 config.yaml 会被仅含 avatar 的 YAML 整体覆盖、全部站点配置静默丢失，必须阻断
  if (!remoteRaw) {
    const detail = [configResData._remoteConfigError, configResData._remoteConfigStatus].find(Boolean) ?? '';
    message.error(`${getTranslate('settings.avatarSync.remoteUnavailable')}${detail ? `: ${detail}` : ''}`);
    setLoading(false);
    return;
  }
  setLoading(false);
  syncAvatar(
    { avatarUrl: originalAvatar },
    remoteRaw,
    `chore: update avatar for user ${userName}`,
    '',
    { avatarUrl: newAvatar },
  );
}
