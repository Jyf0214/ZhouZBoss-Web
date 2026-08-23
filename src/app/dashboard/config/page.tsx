'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import { useGitHubConfigSync } from '@/hooks/use-github-config-sync';
import ConfigEditor from './config-editor';
import { showError } from '@/lib/error';
import { buildConfigState, type ConfigState } from './config-builders';

export default function ConfigPage() {
  const { isRoot } = useAuth();
  const router = useRouter();
  const redirectRef = useRef(false);
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfigState>({
    site: {
      title: 'Originium Kernel',
      description: t('config.defaultSiteDescription'),
      heroTitleLine1: t('config.defaultHeroTitle1'),
      heroTitleLine2: t('config.defaultHeroTitle2'),
      lang: 'zh-CN',
    },
    appearance: {
      background: { url: '', opacity: 0.8 },
      favicon: '',
      customCSS: '',
      customHead: '',
      fontSize: 15,
      loading: {
        page: { type: 'waves', color: '#71717a', position: 'center' },
        navigation: { type: 'antd', color: '#71717a' },
        slogans: [],
      },
      effects: { mouseClick: false, backgroundParticles: false, confetti: false },
    },
    access: {
      posts: { public: ['*'], private: [] },
      faces: { public: [], private: ['*'] },
      diary: { public: [], private: ['*'] },
    },
    auth: {},
    avatar: { url: '' },
    nav: {
      enable: false,
      clock: false,
      menu: [],
    },
    mourn: { enable: false, days: [] },
    highlight: { theme: 'light', copy: true, lang: true, shrink: false, heightLimit: 330, wordWrap: true },
    copy: { enable: true, copyright: { enable: false, limitCount: 50 } },
    social: {},
    cover: { indexEnable: true, asideEnable: true, archivesEnable: true, position: 'left', defaultCover: [] },
    errorImg: { flink: '/img/friend_404.gif', postPage: '/img/404.jpg' },
    postMeta: {
      page: { dateType: 'created', dateFormat: 'simple', categories: true, tags: true, label: false },
      post: { dateType: 'both', dateFormat: 'date', categories: true, tags: true, label: true, unread: false },
    },
    wordcount: { enable: false, postWordcount: false, min2read: true, totalWordcount: false },
    toc: { post: true, page: false, number: true, expand: false, styleSimple: false },
    copyright: { enable: true, decode: false, authorHref: '', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', authorLink: '/' },
    reward: { enable: true, qrCodes: [] },
    postEdit: { enable: false, github: false },
    share: { sharejs: { enable: true, sites: 'facebook,twitter,wechat,weibo,qq' }, addtoany: { enable: false, item: 'facebook,twitter,wechat,sina_weibo,email,copy_link' } },
    mainTone: { enable: false, mode: 'api' },
    footer: { owner: { enable: true, since: 2026, author: 'Jyf0214' }, customText: '', runtime: { enable: false, launchTime: '04/01/2021 00:00:00' }, socialLinks: [], links: [], badges: [], typedTextPrefix: '', typedText: [] },
    music: { enable: false, autoPlay: false, songs: [] },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<string>('');
  const [remoteConfigStatus, setRemoteConfigStatus] = useState<string>('');
  const [remoteConfigError, setRemoteConfigError] = useState<string>('');
  const initialConfigRef = React.useRef<ConfigState | null>(null);

  const { handleSave: handleGitHubSave, DiffModal } = useGitHubConfigSync({
    repo: '',
    githubConfigured,
    remoteConfig,
    currentConfig: config as unknown as Record<string, unknown>,
    managedFields: ['site', 'appearance', 'access', 'auth', 'avatar', 'nav', 'mourn', 'highlight', 'copy', 'social', 'cover', 'errorImg', 'postMeta', 'wordcount', 'toc', 'copyright', 'reward', 'postEdit', 'share', 'mainTone', 'footer', 'music'],
    onSyncStart: () => setSaving(true),
    onSyncComplete: (yamlContent) => {
      setRemoteConfig(yamlContent);
      setSaving(false);
    },
    onSyncError: () => setSaving(false),
  });

  useEffect(() => {
    if (!isRoot && !redirectRef.current) {
      // 与 env/stats 等其余 root 页面同口径：非 root 直接回 dashboard。
      // /api/config 为 root-only，放行 admin 只会得到加载必败的半坏页面
      redirectRef.current = true;
      router.push('/dashboard');
      return;
    }
    if (!isRoot) return;
    const controller = new AbortController();
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (res.ok) {
          const data: Record<string, unknown> = await res.json();
          const configState = buildConfigState(data);
          setConfig(configState);
          initialConfigRef.current = configState;
          setGithubConfigured(!!data.githubConfigured);
          setRemoteConfig((data._remoteConfig as string) ?? '');
          setRemoteConfigStatus((data._remoteConfigStatus as string) ?? '');
          setRemoteConfigError((data._remoteConfigError as string) ?? '');
        } else {
          const body = await res.json().catch(() => null) as { error?: string } | null;
          showError(body?.error ? `${t('config.loadFailed')}: ${body.error}` : t('config.loadFailed'));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('获取配置失败:', error);
        showError(`${t('config.loadFailed')}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    };
    void fetchConfig();
    return () => controller.abort();
  }, [isRoot, router, t]);

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
