'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import { useGitHubConfigSync } from '@/hooks/use-github-config-sync';
import ConfigEditor from './config-editor';
import { showError } from '@/lib/error';
import { buildConfigState, type ConfigState } from './config-builders';

export default function ConfigPage() {
  const { userRole } = useAuth();
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfigState>({
    site: {
      title: 'Originium Kernel',
      description: '现代内容发布平台',
      heroTitleLine1: '书写。同步。',
      heroTitleLine2: '部署。',
      lang: 'zh-CN',
    },
    appearance: {
      background: { url: '', opacity: 0.8 },
      customCSS: '',
      customHead: '',
      fontSize: 15,
      loading: {
        page: { type: 'waves', color: '#c084fc', position: 'center' },
        navigation: { type: 'antd', color: '#c084fc' },
        slogans: [],
      },
    },
    access: {
      posts: { public: ['*'], private: [] },
      faces: { public: [], private: ['*'] },
      diary: { public: [], private: ['*'] },
    },
    auth: {
      allowRegistration: true,
    },
    nav: {
      enable: false,
      travelling: false,
      clock: false,
      menu: [],
    },
    mourn: { enable: false, days: [] },
    highlight: { theme: 'light', copy: true, lang: true, shrink: false, heightLimit: 330, wordWrap: true },
    copy: { enable: true, copyright: { enable: false, limitCount: 50 } },
    social: {},
    authorStatus: { enable: false, statusImg: '', skills: [] },
    cover: { indexEnable: true, asideEnable: true, archivesEnable: true, position: 'left', defaultCover: [] },
    errorImg: { flink: '/img/friend_404.gif', postPage: '/img/404.jpg' },
    postMeta: {
      page: { dateType: 'created', dateFormat: 'simple', categories: true, tags: true, label: false },
      post: { dateType: 'both', dateFormat: 'date', categories: true, tags: true, label: true, unread: false },
    },
    wordcount: { enable: false, postWordcount: false, min2read: true, totalWordcount: false },
    toc: { post: true, page: false, number: true, expand: false, styleSimple: false },
    copyright: { enable: true, decode: false, authorHref: '', location: '中国', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', avatarSinks: true, authorImgBack: '', authorImgFront: '', authorLink: '/' },
    reward: { enable: true, qrCodes: [] },
    postEdit: { enable: false, github: false },
    share: { sharejs: { enable: true, sites: 'facebook,twitter,wechat,weibo,qq' }, addtoany: { enable: false, item: 'facebook,twitter,wechat,sina_weibo,email,copy_link' } },
    mainTone: { enable: false, mode: 'api' },
    footer: { owner: { enable: true, since: 2020 }, customText: '', runtime: { enable: false, launchTime: '04/01/2021 00:00:00' } },
    users: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<string>('');
  const [remoteConfigStatus, setRemoteConfigStatus] = useState<string>('');
  const [remoteConfigError, setRemoteConfigError] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');
  const initialConfigRef = React.useRef<ConfigState | null>(null);

  const { handleSave: handleGitHubSave, DiffModal } = useGitHubConfigSync({
    repo: githubRepo,
    remoteConfig,
    currentConfig: config as unknown as Record<string, unknown>,
    managedFields: ['site', 'appearance', 'access', 'auth', 'nav', 'mourn', 'highlight', 'copy', 'social', 'authorStatus', 'cover', 'errorImg', 'postMeta', 'wordcount', 'toc', 'copyright', 'reward', 'postEdit', 'share', 'mainTone', 'footer'],
    onSyncStart: () => setSaving(true),
    onSyncComplete: (yamlContent) => {
      setRemoteConfig(yamlContent);
      setSaving(false);
    },
    onSyncError: () => setSaving(false),
  });

  useEffect(() => {
    if (userRole !== 'sudo' && userRole !== 'admin') {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (res.ok) {
          const data: Record<string, unknown> = await res.json();
          setGithubRepo((data._githubRepo as string) ?? '');
          const configState = buildConfigState(data);
          setConfig(configState);
          initialConfigRef.current = configState;
          const repo = (data._githubRepo as string) ?? process.env.NEXT_PUBLIC_GITHUB_REPO ?? '';
          setGithubConfigured(!!repo);
          setRemoteConfig((data._remoteConfig as string) ?? '');
          setRemoteConfigStatus((data._remoteConfigStatus as string) ?? '');
          setRemoteConfigError((data._remoteConfigError as string) ?? '');
        } else {
          showError('配置加载失败');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('获取配置失败:', error);
        showError('配置加载失败');
      } finally {
        setLoading(false);
      }
    };
    void fetchConfig();
    return () => controller.abort();
  }, [userRole]);

  const handleSave = () => {
    handleGitHubSave(initialConfigRef.current as unknown as Record<string, unknown>);
  };

  if (loading) {
    return <GlobalLoading />;
  }

  return (
    <ConfigEditor
      config={config}
      onConfigChange={setConfig}
      t={t}
      githubConfigured={githubConfigured}
      remoteConfigStatus={remoteConfigStatus}
      remoteConfigError={remoteConfigError}
      saving={saving}
      DiffModal={DiffModal}
      onSave={handleSave}
    />
  );
}
