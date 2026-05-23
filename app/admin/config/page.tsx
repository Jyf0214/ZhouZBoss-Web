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
import NavConfig from '@/components/ui/NavConfig';
import MournConfig from '@/components/ui/MournConfig';
import CodeBlockConfig from '@/components/ui/CodeBlockConfig';
import CopyConfig from '@/components/ui/CopyConfig';
import SocialConfig from '@/components/ui/SocialConfig';
import AuthorStatusConfig from '@/components/ui/AuthorStatusConfig';
import CoverConfig from '@/components/ui/CoverConfig';
import ErrorImgConfig from '@/components/ui/ErrorImgConfig';
import PostMetaConfig from '@/components/ui/PostMetaConfig';
import WordCountConfig from '@/components/ui/WordCountConfig';
import TocConfig from '@/components/ui/TocConfig';
import CopyrightConfig from '@/components/ui/CopyrightConfig';
import RewardConfig from '@/components/ui/RewardConfig';
import PostEditConfig from '@/components/ui/PostEditConfig';
import ShareConfig from '@/components/ui/ShareConfig';
import MainToneConfig from '@/components/ui/MainToneConfig';
import FooterConfig from '@/components/ui/FooterConfig';
import GitHubStatus from '@/components/ui/GitHubStatus';
type LoadingType = 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
type LoadingPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface UserConfig {
  avatar?: string;
}

interface NavMenuItemData {
  name: string;
  link: string;
  icon?: string;
}

interface NavMenuGroupData {
  title: string;
  item: NavMenuItemData[];
}

interface NavConfigData {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroupData[];
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
      slogans?: string[];
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
  nav: NavConfigData;
  mourn: { enable: boolean; days: string[] };
  highlight: { theme: string; copy: boolean; lang: boolean; shrink: boolean; heightLimit: number; wordWrap: boolean };
  copy: { enable: boolean; copyright: { enable: boolean; limitCount: number } };
  social: Record<string, string>;
  authorStatus: { enable: boolean; statusImg: string; skills: string[] };
  cover: { indexEnable: boolean; asideEnable: boolean; archivesEnable: boolean; position: 'left' | 'right' | 'both'; defaultCover: string[] };
  errorImg: { flink: string; postPage: string };
  share: { sharejs: { enable: boolean; sites: string }; addtoany: { enable: boolean; item: string } };
  mainTone: { enable: boolean; mode: 'cdn' | 'api' | 'both' };
  footer: { owner: { enable: boolean; since: number }; customText: string; runtime: { enable: boolean; launchTime: string } };
  postMeta: {
    page: { dateType: string; dateFormat: string; categories: boolean; tags: boolean; label: boolean };
    post: { dateType: string; dateFormat: string; categories: boolean; tags: boolean; label: boolean; unread: boolean };
  };
  wordcount: { enable: boolean; postWordcount: boolean; min2read: boolean; totalWordcount: boolean };
  toc: { post: boolean; page: boolean; number: boolean; expand: boolean; styleSimple: boolean };
  copyright: { enable: boolean; decode: boolean; authorHref: string; location: string; license: string; licenseUrl: string; avatarSinks: boolean; authorImgBack: string; authorImgFront: string; authorLink: string };
  reward: { enable: boolean; qrCodes: { img: string; link: string; text: string }[] };
  postEdit: { enable: boolean; github: string | false };
  users?: Record<string, UserConfig>;
}

function buildSiteConfig(data: Record<string, unknown>): ConfigState['site'] {
  const siteData = data.site as Record<string, string> | undefined;
  return {
    title: siteData?.title ?? 'Originium Kernel',
    description: siteData?.description ?? '',
    heroTitleLine1: siteData?.heroTitleLine1 ?? '',
    heroTitleLine2: siteData?.heroTitleLine2 ?? '',
    lang: siteData?.lang ?? 'zh-CN',
  };
}

function buildAppearanceConfig(data: Record<string, unknown>): ConfigState['appearance'] {
  const appearanceData = data.appearance as Record<string, unknown> | undefined;
  return {
    background: (appearanceData?.background as ConfigState['appearance']['background']) ?? { url: '', opacity: 0.8 },
    customCSS: (appearanceData?.customCSS as string) ?? '',
    customHead: (appearanceData?.customHead as string) ?? '',
    loading: (appearanceData?.loading as ConfigState['appearance']['loading']) ?? {
      page: { type: 'waves', color: '#c084fc', position: 'center' },
      navigation: { type: 'antd', color: '#c084fc' },
    },
  };
}

function buildAccessConfig(data: Record<string, unknown>): ConfigState['access'] {
  return (data.access as ConfigState['access']) || {
    posts: { public: ['*'], private: [] },
    faces: { public: [], private: ['*'] },
    diary: { public: [], private: ['*'] },
  };
}

function buildAuthConfig(data: Record<string, unknown>): ConfigState['auth'] {
  return (data.auth as ConfigState['auth']) || { allowRegistration: true };
}

function buildNavConfig(data: Record<string, unknown>): ConfigState['nav'] {
  const navData = data.nav as Record<string, unknown> | undefined;
  if (!navData) {
    return { enable: false, travelling: false, clock: false, menu: [] };
  }
  return {
    enable: (navData.enable as boolean) ?? false,
    travelling: (navData.travelling as boolean) ?? false,
    clock: (navData.clock as boolean) ?? false,
    menu: (navData.menu as NavMenuGroupData[]) ?? [],
  };
}

function buildMournConfig(data: Record<string, unknown>): ConfigState['mourn'] {
  const d = data.mourn as Record<string, unknown> | undefined;
  return { enable: (d?.enable as boolean) ?? false, days: (d?.days as string[]) ?? [] };
}

function buildHighlightConfig(data: Record<string, unknown>): ConfigState['highlight'] {
  const d = data.highlight as Record<string, unknown> | undefined;
  return {
    theme: (d?.theme as string) ?? 'light',
    copy: (d?.copy as boolean) ?? true,
    lang: (d?.lang as boolean) ?? true,
    shrink: (d?.shrink as boolean) ?? false,
    heightLimit: (d?.heightLimit as number) ?? 330,
    wordWrap: (d?.wordWrap as boolean) ?? true,
  };
}

function buildCopyConfig(data: Record<string, unknown>): ConfigState['copy'] {
  const d = data.copy as Record<string, unknown> | undefined;
  const cr = d?.copyright as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? true,
    copyright: {
      enable: (cr?.enable as boolean) ?? false,
      limitCount: (cr?.limitCount as number) ?? 50,
    },
  };
}

function buildSocialConfig(data: Record<string, unknown>): ConfigState['social'] {
  return (data.social as Record<string, string>) ?? {};
}

function buildAuthorStatusConfig(data: Record<string, unknown>): ConfigState['authorStatus'] {
  const d = data.authorStatus as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    statusImg: (d?.statusImg as string) ?? '',
    skills: (d?.skills as string[]) ?? [],
  };
}

function buildCoverConfig(data: Record<string, unknown>): ConfigState['cover'] {
  const d = data.cover as Record<string, unknown> | undefined;
  return {
    indexEnable: (d?.indexEnable as boolean) ?? true,
    asideEnable: (d?.asideEnable as boolean) ?? true,
    archivesEnable: (d?.archivesEnable as boolean) ?? true,
    position: (d?.position as 'left' | 'right' | 'both') ?? 'left',
    defaultCover: (d?.defaultCover as string[]) ?? [],
  };
}

function buildErrorImgConfig(data: Record<string, unknown>): ConfigState['errorImg'] {
  const d = data.errorImg as Record<string, unknown> | undefined;
  return {
    flink: (d?.flink as string) ?? '/img/friend_404.gif',
    postPage: (d?.postPage as string) ?? '/img/404.jpg',
  };
}

function buildPostMetaConfig(data: Record<string, unknown>): ConfigState['postMeta'] {
  const d = data.postMeta as Record<string, unknown> | undefined;
  const page = d?.page as Record<string, unknown> | undefined;
  const post = d?.post as Record<string, unknown> | undefined;
  return {
    page: {
      dateType: (page?.dateType as string) ?? 'created',
      dateFormat: (page?.dateFormat as string) ?? 'simple',
      categories: (page?.categories as boolean) ?? true,
      tags: (page?.tags as boolean) ?? true,
      label: (page?.label as boolean) ?? false,
    },
    post: {
      dateType: (post?.dateType as string) ?? 'both',
      dateFormat: (post?.dateFormat as string) ?? 'date',
      categories: (post?.categories as boolean) ?? true,
      tags: (post?.tags as boolean) ?? true,
      label: (post?.label as boolean) ?? true,
      unread: (post?.unread as boolean) ?? false,
    },
  };
}

function buildWordCountConfig(data: Record<string, unknown>): ConfigState['wordcount'] {
  const d = data.wordcount as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    postWordcount: (d?.postWordcount as boolean) ?? false,
    min2read: (d?.min2read as boolean) ?? true,
    totalWordcount: (d?.totalWordcount as boolean) ?? false,
  };
}

function buildTocConfig(data: Record<string, unknown>): ConfigState['toc'] {
  const d = data.toc as Record<string, unknown> | undefined;
  return {
    post: (d?.post as boolean) ?? true,
    page: (d?.page as boolean) ?? false,
    number: (d?.number as boolean) ?? true,
    expand: (d?.expand as boolean) ?? false,
    styleSimple: (d?.styleSimple as boolean) ?? false,
  };
}

function buildCopyrightConfig(data: Record<string, unknown>): ConfigState['copyright'] {
  const d = data.copyright as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? true,
    decode: (d?.decode as boolean) ?? false,
    authorHref: (d?.authorHref as string) ?? '',
    location: (d?.location as string) ?? '中国',
    license: (d?.license as string) ?? 'CC BY-NC-SA 4.0',
    licenseUrl: (d?.licenseUrl as string) ?? 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    avatarSinks: (d?.avatarSinks as boolean) ?? true,
    authorImgBack: (d?.authorImgBack as string) ?? '',
    authorImgFront: (d?.authorImgFront as string) ?? '',
    authorLink: (d?.authorLink as string) ?? '/',
  };
}

function buildRewardConfig(data: Record<string, unknown>): ConfigState['reward'] {
  const d = data.reward as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? true,
    qrCodes: (d?.qrCodes as ConfigState['reward']['qrCodes']) ?? [],
  };
}

function buildPostEditConfig(data: Record<string, unknown>): ConfigState['postEdit'] {
  const d = data.postEdit as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    github: (d?.github as string | false) ?? false,
  };
}

function buildShareConfig(data: Record<string, unknown>): ConfigState['share'] {
  const d = data.share as Record<string, unknown> | undefined;
  const sharejs = d?.sharejs as Record<string, unknown> | undefined;
  const addtoany = d?.addtoany as Record<string, unknown> | undefined;
  return {
    sharejs: {
      enable: (sharejs?.enable as boolean) ?? true,
      sites: (sharejs?.sites as string) ?? 'facebook,twitter,wechat,weibo,qq',
    },
    addtoany: {
      enable: (addtoany?.enable as boolean) ?? false,
      item: (addtoany?.item as string) ?? 'facebook,twitter,wechat,sina_weibo,email,copy_link',
    },
  };
}

function buildMainToneConfig(data: Record<string, unknown>): ConfigState['mainTone'] {
  const d = data.mainTone as Record<string, unknown> | undefined;
  return {
    enable: (d?.enable as boolean) ?? false,
    mode: (d?.mode as 'cdn' | 'api' | 'both') ?? 'api',
  };
}

function buildFooterConfig(data: Record<string, unknown>): ConfigState['footer'] {
  const d = data.footer as Record<string, unknown> | undefined;
  const owner = d?.owner as Record<string, unknown> | undefined;
  const runtime = d?.runtime as Record<string, unknown> | undefined;
  return {
    owner: {
      enable: (owner?.enable as boolean) ?? true,
      since: (owner?.since as number) ?? 2020,
    },
    customText: (d?.customText as string) ?? '',
    runtime: {
      enable: (runtime?.enable as boolean) ?? false,
      launchTime: (runtime?.launchTime as string) ?? '04/01/2021 00:00:00',
    },
  };
}

function buildConfigState(data: Record<string, unknown>): ConfigState {
  return {
    site: buildSiteConfig(data),
    appearance: buildAppearanceConfig(data),
    access: buildAccessConfig(data),
    auth: buildAuthConfig(data),
    nav: buildNavConfig(data),
    mourn: buildMournConfig(data),
    highlight: buildHighlightConfig(data),
    copy: buildCopyConfig(data),
    social: buildSocialConfig(data),
    authorStatus: buildAuthorStatusConfig(data),
    cover: buildCoverConfig(data),
    errorImg: buildErrorImgConfig(data),
    postMeta: buildPostMetaConfig(data),
    wordcount: buildWordCountConfig(data),
    toc: buildTocConfig(data),
    copyright: buildCopyrightConfig(data),
    reward: buildRewardConfig(data),
    postEdit: buildPostEditConfig(data),
    share: buildShareConfig(data),
    mainTone: buildMainToneConfig(data),
    footer: buildFooterConfig(data),
    users: (data.users as Record<string, UserConfig>) || {},
  };
}

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
        onClick={onSave}
        loading={saving}
        icon={<Save size={18} />}
        type="primary"
        className="!w-12 !h-12 !rounded-full bg-zinc-900 hover:!bg-zinc-800 shadow-lg !border-0 flex items-center justify-center"
        disabled={!githubConfigured || remoteFetchFailed}
      />
    </div>
  );
}

function buildAccessItems(t: (key: string) => string) {
  return [
    { key: 'posts' as const, label: t('config.accessPosts') || '文章' },
    { key: 'faces' as const, label: t('config.accessFaces') || '面孔' },
    { key: 'diary' as const, label: t('config.accessDiary') || '日记' },
  ];
}

function getPageLoadingConfig(config: ConfigState) {
  return {
    type: config.appearance.loading?.page?.type ?? 'waves',
    color: config.appearance.loading?.page?.color ?? '#c084fc',
    position: config.appearance.loading?.page?.position ?? 'center',
  };
}

function getNavLoadingConfig(config: ConfigState) {
  return {
    type: config.appearance.loading?.navigation?.type ?? 'antd',
    color: config.appearance.loading?.navigation?.color ?? '#c084fc',
  };
}

function LoadingAnimationsSection({
  config,
  onPageLoadingChange,
  onNavLoadingChange,
  onSlogansChange,
}: {
  config: ConfigState;
  onPageLoadingChange: (newConfig: { type: LoadingType; color: string; position?: LoadingPosition }) => void;
  onNavLoadingChange: (newConfig: { type: LoadingType; color: string }) => void;
  onSlogansChange: (slogans: string[]) => void;
}) {
  const slogansText = (config.appearance.loading?.slogans ?? []).join('\n');

  return (
    <ConfigSection title="加载动画" icon={Loader2} color="bg-purple-500">
      <div className="space-y-4">
        <LoadingAnimationConfig
          title="轻加载（页面内数据加载）"
          config={getPageLoadingConfig(config)}
          onChange={onPageLoadingChange}
          showPosition
        />
        <LoadingAnimationConfig
          title="重加载（路由导航/F5刷新）"
          config={getNavLoadingConfig(config)}
          onChange={onNavLoadingChange}
        />
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-100">
        <FormField
          label="网站欢迎标语（每行一条，随机显示）"
          value={slogansText}
          onChange={v => onSlogansChange(v.split('\n').filter(s => s.trim().length > 0))}
          type="textarea"
          rows={8}
          placeholder={'欢迎拜访\nWelcome, my friend!\n不忘初心，一生浪漫'}
        />
      </div>
    </ConfigSection>
  );
}

function ConfigFormBody({
  config,
  onConfigChange,
  t,
}: {
  config: ConfigState;
  onConfigChange: (config: ConfigState) => void;
  t: (key: string) => string;
}) {
  const handlePageLoadingChange = (newConfig: { type: LoadingType; color: string; position?: LoadingPosition }) => {
    onConfigChange({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          page: {
            type: newConfig.type,
            color: newConfig.color,
            position: (newConfig.position ?? 'center'),
          },
        },
      },
    });
  };

  const handleNavLoadingChange = (newConfig: { type: LoadingType; color: string }) => {
    onConfigChange({
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

  const handleSlogansChange = (slogans: string[]) => {
    onConfigChange({
      ...config,
      appearance: {
        ...config.appearance,
        loading: {
          ...config.appearance.loading,
          slogans,
        },
      },
    });
  };

  const handleAccessToggle = (type: 'posts' | 'faces' | 'diary', checked: boolean) => {
    onConfigChange({
      ...config,
      access: {
        ...config.access,
        [type]: checked ? { public: ['*'], private: [] } : { public: [], private: ['*'] },
      },
    });
  };

  const isAccessPublic = (type: 'posts' | 'faces' | 'diary') => {
    return config.access[type].public.includes('*');
  };

  const accessItems = buildAccessItems(t);

  return (
    <>
      <ConfigSection title={t('config.general')} color="bg-emerald-500">
        <SiteConfigForm
          config={config.site}
          onChange={newSite => onConfigChange({ ...config, site: newSite })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.auth')} icon={Shield} color="bg-amber-500">
        <ToggleField
          label={t('config.allowRegistration')}
          description={t('config.allowRegistrationHint')}
          checked={config.auth.allowRegistration}
          onChange={checked => onConfigChange({ ...config, auth: { ...config.auth, allowRegistration: checked } })}
        />
      </ConfigSection>

      <AccessControlSection
        title={t('config.accessControl') || '访问控制'}
        items={accessItems}
        isPublic={isAccessPublic}
        onToggle={handleAccessToggle}
        publicLabel={t('config.accessPublic') || '公开'}
        privateLabel={t('config.accessPrivate') || '私有（默认全部）'}
      />

      <ConfigSection title={t('config.background')} color="bg-blue-500">
        <BackgroundConfig
          config={config.appearance.background}
          onChange={newBg => onConfigChange({
            ...config,
            appearance: { ...config.appearance, background: newBg },
          })}
          urlLabel={t('config.backgroundUrl')}
          opacityLabel={t('config.overlayOpacity')}
        />
      </ConfigSection>

      <ConfigSection title={t('config.customCSS') || '自定义 CSS'} color="bg-orange-500">
        <FormField
          label=""
          value={config.appearance.customCSS}
          onChange={v => onConfigChange({
            ...config,
            appearance: { ...config.appearance, customCSS: v },
          })}
          type="textarea"
          rows={6}
          placeholder={t('config.customCSSPlaceholder') || '/* 在此输入自定义样式 */'}
        />
      </ConfigSection>

      <ConfigSection title={t('config.customHead') || '自定义 Head 标签'} color="bg-cyan-500">
        <FormField
          label=""
          value={config.appearance.customHead}
          onChange={v => onConfigChange({
            ...config,
            appearance: { ...config.appearance, customHead: v },
          })}
          type="textarea"
          rows={4}
          placeholder={t('config.customHeadPlaceholder') || '<meta name="example" content="value">'}
        />
      </ConfigSection>

      <ConfigSection title={t('config.nav') || '导航栏'} icon={Settings} color="bg-indigo-500">
        <NavConfig
          config={config.nav}
          onChange={newNav => onConfigChange({ ...config, nav: newNav })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.mourn') || '哀悼日'} color="bg-zinc-500">
        <MournConfig
          config={config.mourn}
          onChange={v => onConfigChange({ ...config, mourn: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.highlight') || '代码高亮'} color="bg-emerald-600">
        <CodeBlockConfig
          config={config.highlight}
          onChange={v => onConfigChange({ ...config, highlight: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.copy') || '复制设置'} color="bg-cyan-600">
        <CopyConfig
          config={config.copy}
          onChange={v => onConfigChange({ ...config, copy: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.social') || '社交链接'} color="bg-pink-500">
        <SocialConfig
          config={config.social}
          onChange={v => onConfigChange({ ...config, social: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.authorStatus') || '作者卡片'} color="bg-rose-500">
        <AuthorStatusConfig
          config={config.authorStatus}
          onChange={v => onConfigChange({ ...config, authorStatus: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.cover') || '封面设置'} color="bg-teal-500">
        <CoverConfig
          config={config.cover}
          onChange={v => onConfigChange({ ...config, cover: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.errorImg') || '错误图片'} color="bg-red-500">
        <ErrorImgConfig
          config={config.errorImg}
          onChange={v => onConfigChange({ ...config, errorImg: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.postMeta') || '文章元信息'} color="bg-violet-500">
        <PostMetaConfig
          config={config.postMeta}
          onChange={v => onConfigChange({ ...config, postMeta: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.wordcount') || '字数统计'} color="bg-orange-600">
        <WordCountConfig
          config={config.wordcount}
          onChange={v => onConfigChange({ ...config, wordcount: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.toc') || '目录'} color="bg-lime-600">
        <TocConfig
          config={config.toc}
          onChange={v => onConfigChange({ ...config, toc: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.copyright') || '版权信息'} color="bg-blue-600">
        <CopyrightConfig
          config={config.copyright}
          onChange={v => onConfigChange({ ...config, copyright: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.reward') || '打赏'} color="bg-yellow-600">
        <RewardConfig
          config={config.reward}
          onChange={v => onConfigChange({ ...config, reward: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.postEdit') || '在线编辑'} color="bg-sky-600">
        <PostEditConfig
          config={config.postEdit}
          onChange={v => onConfigChange({ ...config, postEdit: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.share') || '分享'} color="bg-green-500">
        <ShareConfig
          config={config.share}
          onChange={v => onConfigChange({ ...config, share: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.mainTone') || '主色调'} color="bg-purple-500">
        <MainToneConfig
          config={config.mainTone}
          onChange={v => onConfigChange({ ...config, mainTone: v })}
        />
      </ConfigSection>

      <ConfigSection title={t('config.footer') || '页脚'} color="bg-zinc-600">
        <FooterConfig
          config={config.footer}
          onChange={v => onConfigChange({ ...config, footer: v })}
        />
      </ConfigSection>

      <LoadingAnimationsSection
        config={config}
        onPageLoadingChange={handlePageLoadingChange}
        onNavLoadingChange={handleNavLoadingChange}
        onSlogansChange={handleSlogansChange}
      />
    </>
  );
}

function ConfigEditor({
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
    currentConfig: config,
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
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
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
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    void fetchConfig();
  }, [userRole]);

  const handleSave = () => {
    handleGitHubSave(initialConfigRef.current);
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
