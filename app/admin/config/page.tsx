'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from 'antd';
import { Settings, Save, Shield, Loader2 } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
import { useGitHubConfigSync } from '@/hooks/use-github-config-sync';
import ConfigSection from '@/components/ui/ConfigSection';
import FormField from '@/components/ui/FormField';
import ToggleField from '@/components/ui/ToggleField';
import SiteConfigForm from '@/components/ui/SiteConfigForm';
import LoadingAnimationConfig from '@/components/ui/LoadingAnimationConfig';
import AccessControlSection from '@/components/ui/AccessControlSection';
import BackgroundConfig from '@/components/ui/BackgroundConfig';
import GitHubStatus from '@/components/ui/GitHubStatus';
type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface UserConfig {
  avatar?: string;
}

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
  users?: Record<string, UserConfig>;
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
    currentConfig: config,
    managedFields: ['site', 'appearance', 'access', 'auth'],
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
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setGithubRepo(data._githubRepo || '');
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
            users: data.users || {},
          });
          initialConfigRef.current = {
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
            users: data.users || {},
          };
          const repo = data._githubRepo || process.env.NEXT_PUBLIC_GITHUB_REPO || '';
          setGithubConfigured(!!repo);
          setRemoteConfig(data._remoteConfig || '');
          setRemoteConfigStatus(data._remoteConfigStatus || '');
          setRemoteConfigError(data._remoteConfigError || '');
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [userRole]);

  const handleSave = () => {
    handleGitHubSave(initialConfigRef.current);
  };

  // 更新页面加载动画配置
  const handlePageLoadingChange = (newConfig: { type: LoadingType; color: string; position?: LoadingPosition }) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          page: {
            type: newConfig.type,
            color: newConfig.color,
            position: (newConfig.position || 'center') as LoadingPosition,
          },
        },
      },
    });
  };

  // 更新导航加载动画配置
  const handleNavLoadingChange = (newConfig: { type: LoadingType; color: string }) => {
    setConfig({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          navigation: {
            type: newConfig.type,
            color: newConfig.color,
          },
        },
      },
    });
  };

  // 访问控制切换
  const handleAccessToggle = (type: 'posts' | 'faces' | 'diary', checked: boolean) => {
    const isPublic = checked;
    setConfig({
      ...config,
      access: {
        ...config.access,
        [type]: isPublic ? { public: ['*'], private: [] } : { public: [], private: ['*'] },
      },
    });
  };

  const isAccessPublic = (type: 'posts' | 'faces' | 'diary') => {
    return config.access[type].public.includes('*');
  };

  const accessItems = [
    { key: 'posts' as const, label: t('config.accessPosts') || '文章' },
    { key: 'faces' as const, label: t('config.accessFaces') || '面孔' },
    { key: 'diary' as const, label: t('config.accessDiary') || '日记' },
  ];

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

  const remoteFetchFailed = !!(remoteConfigStatus === 'error' && githubRepo);

  return (
    <div className="min-h-screen bg-zinc-50">
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

      {/* 远程配置拉取失败提示 */}
      {remoteFetchFailed && (
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
            {remoteConfigError || '未知错误'}
          </div>
          <p className="mt-3 text-xs text-red-500">
            保存功能暂时不可用，请修复后刷新页面重试
          </p>
        </div>
      )}

      {/* 站点设置 */}
      <ConfigSection title={t('config.general')} color="bg-emerald-500">
        <SiteConfigForm
          config={config.site}
          onChange={newSite => setConfig({ ...config, site: newSite })}
        />
      </ConfigSection>

      {/* 认证设置 */}
      <ConfigSection title={t('config.auth')} icon={Shield} color="bg-amber-500">
        <ToggleField
          label={t('config.allowRegistration')}
          description={t('config.allowRegistrationHint')}
          checked={config.auth.allowRegistration}
          onChange={checked => setConfig({ ...config, auth: { ...config.auth, allowRegistration: checked } })}
        />
      </ConfigSection>

      {/* 访问控制 */}
      <AccessControlSection
        title={t('config.accessControl') || '访问控制'}
        items={accessItems}
        isPublic={isAccessPublic}
        onToggle={handleAccessToggle}
        publicLabel={t('config.accessPublic') || '公开'}
        privateLabel={t('config.accessPrivate') || '私有（默认全部）'}
      />

      {/* 背景设置 */}
      <ConfigSection title={t('config.background')} color="bg-blue-500">
        <BackgroundConfig
          config={config.appearance.background}
          onChange={newBg => setConfig({
            ...config,
            appearance: { ...config.appearance, background: newBg },
          })}
          urlLabel={t('config.backgroundUrl')}
          opacityLabel={t('config.overlayOpacity')}
        />
      </ConfigSection>

      {/* 自定义 CSS */}
      <ConfigSection title={t('config.customCSS') || '自定义 CSS'} color="bg-orange-500">
        <FormField
          label=""
          value={config.appearance.customCSS}
          onChange={v => setConfig({
            ...config,
            appearance: { ...config.appearance, customCSS: v },
          })}
          type="textarea"
          rows={6}
          placeholder={t('config.customCSSPlaceholder') || '/* 在此输入自定义样式 */'}
        />
      </ConfigSection>

      {/* 自定义 Head 标签 */}
      <ConfigSection title={t('config.customHead') || '自定义 Head 标签'} color="bg-cyan-500">
        <FormField
          label=""
          value={config.appearance.customHead}
          onChange={v => setConfig({
            ...config,
            appearance: { ...config.appearance, customHead: v },
          })}
          type="textarea"
          rows={4}
          placeholder={t('config.customHeadPlaceholder') || '<meta name="example" content="value">'}
        />
      </ConfigSection>

      {/* 加载动画设置 */}
      <ConfigSection title="加载动画" icon={Loader2} color="bg-purple-500">
        <div className="space-y-4">
          <LoadingAnimationConfig
            title="轻加载（页面内数据加载）"
            config={{
              type: config.appearance.loading?.page?.type || 'waves',
              color: config.appearance.loading?.page?.color || '#c084fc',
              position: config.appearance.loading?.page?.position || 'center',
            }}
            onChange={handlePageLoadingChange}
            showPosition
          />
          <LoadingAnimationConfig
            title="重加载（路由导航/F5刷新）"
            config={{
              type: config.appearance.loading?.navigation?.type || 'antd',
              color: config.appearance.loading?.navigation?.color || '#c084fc',
            }}
            onChange={handleNavLoadingChange}
          />
        </div>
      </ConfigSection>

      {/* GitHub 状态 */}
      <GitHubStatus
        configured={githubConfigured}
        configuredText="已配置，将保存到 GitHub"
        notConfiguredText="未配置（请设置 GITHUB_REPO 和 GITHUB_TOKEN）"
      />

      {DiffModal}
    </div>

      {/* 保存按钮 - 圆形，固定在右下角 */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={handleSave}
          loading={saving}
          icon={<Save size={18} />}
          type="primary"
          className="!w-12 !h-12 !rounded-full bg-zinc-900 hover:!bg-zinc-800 shadow-lg !border-0 flex items-center justify-center"
          disabled={!githubConfigured || remoteFetchFailed}
        />
      </div>
    </div>
  );
}
