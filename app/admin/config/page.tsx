'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Settings, Github, CheckCircle, XCircle, Image as ImageIcon, Shield, Loader2 } from 'lucide-react';
import { Slider, Button, Switch, message, Select, ColorPicker } from 'antd';
import { showError } from '@/lib/error';
import { GlobalLoading } from '@/components/Loading';
import { updateFileInGithub, getFileFromGithub } from '@/lib/github';
import { useGitHubDiff } from '@/hooks/use-github-diff';
import type { Color } from 'antd/es/color-picker';

type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const loadingTypeOptions = [
  { value: 'spinner', label: '环形加载 (spinner)' },
  { value: 'antd', label: 'Ant Design 图标 (antd)' },
  { value: 'text', label: '文字动画 (text)' },
  { value: 'dots', label: '三色弹跳 (dots)' },
  { value: 'glow', label: '光晕渐变 (glow)' },
  { value: 'waves', label: '波浪动画 (waves)' },
];

const positionOptions = [
  { value: 'center', label: '居中' },
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-right', label: '右下角' },
];

interface ConfigState {
  site: {
    title: string;
    description: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    lang: string;
  };
  appearance: {
    background: {
      url: string;
      opacity: number;
    };
    customCSS: string;
    customHead: string;
    loading?: {
      page?: {
        type: LoadingType;
        color: string;
        position: LoadingPosition;
      };
      navigation?: {
        type: LoadingType;
        color: string;
      };
    };
  };
  access: {
    posts: { public: string[]; private: string[] };
    faces: { public: string[]; private: string[] };
    diary: { public: string[]; private: string[] };
  };
  auth: {
    allowRegistration: boolean;
    admin?: { avatar?: string };
  };
}

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
      loading: {
        page: { type: 'waves', color: '#c084fc', position: 'center' },
        navigation: { type: 'antd', color: '#c084fc' },
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<string>('');

  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO || '';
  const githubToken = process.env.GITHUB_TOKEN || '';
  const { showDiff, DiffModal } = useGitHubDiff({
    repo: githubRepo,
    onSuccess: () => message.success(t('config.saveSuccess')),
    onError: (error) => showError(`${t('config.saveFailed')}: ${error.message}`),
  });

  useEffect(() => {
    if (userRole !== 'sudo' && userRole !== 'admin') {
      setLoading(false);
      return;
    }
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setConfig({
            site: {
              title: data.site?.title || 'Originium Kernel',
              description: data.site?.description || '',
              heroTitleLine1: data.site?.heroTitleLine1 || '',
              heroTitleLine2: data.site?.heroTitleLine2 || '',
              lang: data.site?.lang || 'zh-CN',
            },
            appearance: {
              background: data.appearance?.background || { url: '', opacity: 0.8 },
              customCSS: data.appearance?.customCSS || '',
              customHead: data.appearance?.customHead || '',
              loading: data.appearance?.loading || {
                page: { type: 'waves', color: '#c084fc', position: 'center' },
                navigation: { type: 'antd', color: '#c084fc' },
              },
            },
            access: data.access || {
              posts: { public: ['*'], private: [] },
              faces: { public: [], private: ['*'] },
              diary: { public: [], private: ['*'] },
            },
            auth: data.auth || { allowRegistration: true },
          });
          setGithubConfigured(!!(data._githubRepo && data._githubToken));

          if (githubRepo && githubToken) {
            const remote = await getFileFromGithub(githubRepo, githubToken, 'config.json');
            setRemoteConfig(remote?.content || '');
          }
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [userRole, githubRepo, githubToken]);

  const handleSave = () => {
    if (!githubRepo || !githubToken) {
      message.error('GitHub 未配置');
      return;
    }

    const newContent = JSON.stringify(config, null, 2);
    showDiff({
      filePath: 'config.json',
      oldContent: remoteConfig,
      newContent,
      onSubmit: async () => {
        setSaving(true);
        try {
          await updateFileInGithub({
            repo: githubRepo,
            token: githubToken,
            path: 'config.json',
            content: newContent,
            message: 'chore: update config from admin panel',
          });
          setRemoteConfig(newContent);
        } catch (error) {
          throw error;
        } finally {
          setSaving(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <GlobalLoading />
      </div>
    );
  }

  if (userRole !== 'sudo' && userRole !== 'admin') {
    return (
      <div className="p-8 text-center">
        <span className="text-red-500">{t('common.accessDenied')}</span>
      </div>
    );
  }

  const handlePageTypeChange = (v: LoadingType) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          page: {
            type: v,
            color: config.appearance.loading?.page?.color || '#c084fc',
            position: config.appearance.loading?.page?.position || 'center',
          },
        },
      },
    });
  };

  const handlePageColorChange = (c: Color) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          page: {
            type: config.appearance.loading?.page?.type || 'waves',
            color: c.toHexString(),
            position: config.appearance.loading?.page?.position || 'center',
          },
        },
      },
    });
  };

  const handlePagePositionChange = (v: LoadingPosition) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          page: {
            type: config.appearance.loading?.page?.type || 'waves',
            color: config.appearance.loading?.page?.color || '#c084fc',
            position: v,
          },
        },
      },
    });
  };

  const handleNavTypeChange = (v: LoadingType) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          navigation: {
            type: v,
            color: config.appearance.loading?.navigation?.color || '#c084fc',
          },
        },
      },
    });
  };

  const handleNavColorChange = (c: Color) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          navigation: {
            type: config.appearance.loading?.navigation?.type || 'antd',
            color: c.toHexString(),
          },
        },
      },
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('config.title')}</h1>
          <p className="text-sm text-zinc-400">{t('config.subtitle')}</p>
        </div>
      </div>

      {/* 站点设置 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t('config.general')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('config.siteTitle')}</label>
            <input
              type="text"
              value={config.site.title}
              onChange={e => setConfig({ ...config, site: { ...config.site, title: e.target.value } })}
              className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('config.siteDescription')}</label>
            <input
              type="text"
              value={config.site.description}
              onChange={e => setConfig({ ...config, site: { ...config.site, description: e.target.value } })}
              className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('config.heroTitle1')}</label>
            <input
              type="text"
              value={config.site.heroTitleLine1}
              onChange={e => setConfig({ ...config, site: { ...config.site, heroTitleLine1: e.target.value } })}
              className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('config.heroTitle2')}</label>
            <input
              type="text"
              value={config.site.heroTitleLine2}
              onChange={e => setConfig({ ...config, site: { ...config.site, heroTitleLine2: e.target.value } })}
              className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* 认证设置 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <Shield size={16} />
          {t('config.auth')}
        </h2>
        <div className="flex items-center justify-between py-3 px-4 bg-zinc-50 rounded-xl">
          <div>
            <div className="text-sm font-medium text-zinc-900">{t('config.allowRegistration')}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{t('config.allowRegistrationHint')}</div>
          </div>
          <Switch
            checked={config.auth.allowRegistration}
            onChange={checked => setConfig({ ...config, auth: { ...config.auth, allowRegistration: checked } })}
          />
        </div>
      </div>

      {/* 背景设置 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <ImageIcon size={16} />
          {t('config.background')}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('config.backgroundUrl')}</label>
          <input
            type="text"
            value={config.appearance.background.url}
            onChange={e => setConfig({
              ...config,
              appearance: { ...config.appearance, background: { ...config.appearance.background, url: e.target.value } }
            })}
            className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('config.overlayOpacity')}: {Math.round(config.appearance.background.opacity * 100)}%
          </label>
          <Slider
            min={0} max={1} step={0.05}
            value={config.appearance.background.opacity}
            onChange={value => setConfig({
              ...config,
              appearance: { ...config.appearance, background: { ...config.appearance.background, opacity: value } }
            })}
            tooltip={{ formatter: (v) => `${Math.round((v || 0) * 100)}%` }}
          />
        </div>
      </div>

      {/* 加载动画设置 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <Loader2 size={16} />
          加载动画
        </h2>

        {/* 轻加载设置 */}
        <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
          <h3 className="text-sm font-bold text-zinc-700 mb-3">轻加载（页面内数据加载）</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-500">动画类型</label>
              <Select
                value={config.appearance.loading?.page?.type || 'waves'}
                onChange={handlePageTypeChange}
                options={loadingTypeOptions}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-500">颜色</label>
              <ColorPicker
                value={config.appearance.loading?.page?.color || '#c084fc'}
                onChange={handlePageColorChange}
                showText
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-500">位置</label>
              <Select
                value={config.appearance.loading?.page?.position || 'center'}
                onChange={handlePagePositionChange}
                options={positionOptions}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* 重加载设置 */}
        <div className="p-4 bg-zinc-50 rounded-xl">
          <h3 className="text-sm font-bold text-zinc-700 mb-3">重加载（路由导航/F5刷新）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-500">动画类型</label>
              <Select
                value={config.appearance.loading?.navigation?.type || 'antd'}
                onChange={handleNavTypeChange}
                options={loadingTypeOptions}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-500">颜色</label>
              <ColorPicker
                value={config.appearance.loading?.navigation?.color || '#c084fc'}
                onChange={handleNavColorChange}
                showText
              />
            </div>
          </div>
        </div>
      </div>

      {/* GitHub 状态 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Github size={16} />
          GitHub 同步状态
        </h2>
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: githubConfigured ? '#f6ffed' : '#fff7e6' }}>
          {githubConfigured ? (
            <CheckCircle size={20} style={{ color: '#52c41a' }} />
          ) : (
            <XCircle size={20} style={{ color: '#faad14' }} />
          )}
          <span className="font-medium text-sm">
            {githubConfigured ? '已配置，将保存到 GitHub' : '未配置（请设置 GITHUB_REPO 和 GITHUB_TOKEN）'}
          </span>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={saving}
          icon={<Settings size={14} />}
          type="primary"
          className="bg-zinc-900 hover:bg-zinc-800 rounded-xl h-10 px-8"
          disabled={!githubConfigured}
        >
          {saving ? t('config.saving') : t('config.save')}
        </Button>
      </div>
      {DiffModal}
    </div>
  );
}