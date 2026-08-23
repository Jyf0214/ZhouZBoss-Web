'use client';

import { useEffect, useState } from 'react';
import { showError } from '@/lib/error';
import { getTranslate } from '@/i18n/translate';
import type { RemoteConfigData } from './types';

export interface UseConfigDataResult {
  configData: RemoteConfigData | null;
  configLoaded: boolean;
  githubConfigured: boolean;
}

export interface UseConfigDataOptions {
  /**
   * 是否允许拉取：/api/config 为 root-only 接口，非 root 调用必得 403，
   * 会导致每次打开设置页都弹"配置加载失败"。仅 root 场景（GitHub 头像同步
   * 依赖该数据）才应发起请求。
   */
  enabled: boolean;
}

/**
 * 页面加载时从 /api/config 拉取 GitHub 配置状态与远程配置数据。
 * 不论成功或失败都会将 configLoaded 置为 true，以便上层继续渲染。
 */
export function useConfigData({ enabled }: UseConfigDataOptions): UseConfigDataResult {
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [configData, setConfigData] = useState<RemoteConfigData | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConfigLoaded(true);
      return;
    }
    const controller = new AbortController();
    const fetchGithubInfo = async () => {
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (res.ok) {
          const data: RemoteConfigData = await res.json();
          setGithubConfigured(!!data.githubConfigured);
          setConfigData(data);
        } else {
          const body = await res.json().catch(() => null) as { error?: string } | null;
          showError(body?.error ? `${getTranslate('settings.githubConfigLoadFailed')}: ${body.error}` : getTranslate('settings.githubConfigLoadFailed'));
        }
      } catch (err) {
        // 卸载/依赖变化触发的中止不是真实错误，不弹提示
        if (err instanceof DOMException && err.name === 'AbortError') return;
        showError(`${getTranslate('settings.githubConfigLoadFailed')}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setConfigLoaded(true);
      }
    };
    void fetchGithubInfo();
    return () => controller.abort();
  }, [enabled]);

  return { configData, configLoaded, githubConfigured };
}
