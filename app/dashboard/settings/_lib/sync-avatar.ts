import { message } from 'antd';
import type { RemoteConfigData } from './types';

export interface SyncAvatarChangesArgs {
  githubConfigured: boolean;
  originalAvatar: string;
  uid: string;
  userName: string;
  syncAvatar: (
    initial: Record<string, unknown>,
    remote: string,
    commitMessage: string,
    repo: string,
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
  uid,
  userName,
  syncAvatar,
  setLoading,
}: SyncAvatarChangesArgs): Promise<void> {
  if (!githubConfigured) {
    message.error('GitHub 未配置，无法同步头像');
    return;
  }
  const configRes = await fetch('/api/config');
  if (!configRes.ok) throw new Error('读取配置失败');
  const configResData: RemoteConfigData = await configRes.json();
  const remoteRaw = configResData._remoteConfig ?? '';
  setLoading(false);
  syncAvatar(
    { avatarUrl: originalAvatar, _uid: uid },
    remoteRaw,
    `chore: update avatar for user ${userName}`,
    '',
  );
}
