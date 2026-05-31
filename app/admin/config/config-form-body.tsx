'use client';

import React from 'react';
import { Settings, Loader2 } from 'lucide-react';
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
import type { ConfigState, NavConfigData, LoadingType, LoadingPosition } from './config-builders';

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

interface SimpleHandlerSection {
  title: string;
  color: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function renderSimpleSection(s: SimpleHandlerSection, idx: number) {
  return (
    <ConfigSection key={idx} title={s.title} color={s.color}>
      {s.children}
    </ConfigSection>
  );
}

export default function ConfigFormBody({
  config,
  onConfigChange,
  t,
}: {
  config: ConfigState;
  onConfigChange: (config: ConfigState) => void;
  t: (key: string) => string;
}) {
  const ft = (key: string, fb: string) => t(key) || fb;

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

  const handleAccessToggle = (accessType: 'posts' | 'faces' | 'diary', checked: boolean) => {
    const value = checked ? { public: ['*'], private: [] } : { public: [], private: ['*'] };
    onConfigChange({
      ...config,
      access: {
        ...config.access,
        [accessType]: value,
      },
    });
  };

  const isAccessPublic = (accessType: 'posts' | 'faces' | 'diary') => {
    return config.access[accessType].public.includes('*');
  };

  const accessItems = buildAccessItems(t);

  const handleSiteChange = (newSite: ConfigState['site']) => onConfigChange({ ...config, site: newSite });

  const handleAuthChange = (checked: boolean) => onConfigChange({ ...config, auth: { ...config.auth, allowRegistration: checked } });

  const handleBgChange = (newBg: ConfigState['appearance']['background']) => onConfigChange({
    ...config,
    appearance: { ...config.appearance, background: newBg },
  });

  const handleFontSizeChange = (v: string) => {
    const num = parseInt(v, 10);
    if (!isNaN(num) && num >= 10 && num <= 30) {
      onConfigChange({
        ...config,
        appearance: { ...config.appearance, fontSize: num },
      });
    }
  };

  const handleCssChange = (v: string) => onConfigChange({
    ...config,
    appearance: { ...config.appearance, customCSS: v },
  });

  const handleHeadChange = (v: string) => onConfigChange({
    ...config,
    appearance: { ...config.appearance, customHead: v },
  });

  const handleNavChange = (v: NavConfigData) => onConfigChange({ ...config, nav: v });
  const handleMournChange = (v: ConfigState['mourn']) => onConfigChange({ ...config, mourn: v });
  const handleHighlightChange = (v: ConfigState['highlight']) => onConfigChange({ ...config, highlight: v });
  const handleCopyChange = (v: ConfigState['copy']) => onConfigChange({ ...config, copy: v });
  const handleSocialChange = (v: ConfigState['social']) => onConfigChange({ ...config, social: v });
  const handleAuthorStatusChange = (v: ConfigState['authorStatus']) => onConfigChange({ ...config, authorStatus: v });
  const handleCoverChange = (v: ConfigState['cover']) => onConfigChange({ ...config, cover: v });
  const handleErrorImgChange = (v: ConfigState['errorImg']) => onConfigChange({ ...config, errorImg: v });
  const handlePostMetaChange = (v: ConfigState['postMeta']) => onConfigChange({ ...config, postMeta: v });
  const handleWordcountChange = (v: ConfigState['wordcount']) => onConfigChange({ ...config, wordcount: v });
  const handleTocChange = (v: ConfigState['toc']) => onConfigChange({ ...config, toc: v });
  const handleCopyrightChange = (v: ConfigState['copyright']) => onConfigChange({ ...config, copyright: v });
  const handleRewardChange = (v: ConfigState['reward']) => onConfigChange({ ...config, reward: v });
  const handlePostEditChange = (v: ConfigState['postEdit']) => onConfigChange({ ...config, postEdit: v });
  const handleShareChange = (v: ConfigState['share']) => onConfigChange({ ...config, share: v });
  const handleMainToneChange = (v: ConfigState['mainTone']) => onConfigChange({ ...config, mainTone: v });
  const handleFooterChange = (v: ConfigState['footer']) => onConfigChange({ ...config, footer: v });

  const cssPlaceholder = '/* 在此输入自定义样式 */';
  const headPlaceholder = '<meta name="example" content="value">';

  const simpleSections: SimpleHandlerSection[] = [
    { title: ft('config.customCSS', '自定义 CSS'), color: 'bg-orange-500', children: <FormField label="" value={config.appearance.customCSS} onChange={handleCssChange} type="textarea" rows={6} placeholder={ft('config.customCSSPlaceholder', cssPlaceholder)} /> },
    { title: ft('config.customHead', '自定义 Head 标签'), color: 'bg-cyan-500', children: <FormField label="" value={config.appearance.customHead} onChange={handleHeadChange} type="textarea" rows={4} placeholder={ft('config.customHeadPlaceholder', headPlaceholder)} /> },
    { title: ft('config.nav', '导航栏'), color: 'bg-indigo-500', children: <NavConfig config={config.nav} onChange={handleNavChange} /> },
    { title: ft('config.mourn', '哀悼日'), color: 'bg-zinc-500', children: <MournConfig config={config.mourn} onChange={handleMournChange} /> },
    { title: ft('config.highlight', '代码高亮'), color: 'bg-emerald-600', children: <CodeBlockConfig config={config.highlight} onChange={handleHighlightChange} /> },
    { title: ft('config.copy', '复制设置'), color: 'bg-cyan-600', children: <CopyConfig config={config.copy} onChange={handleCopyChange} /> },
    { title: ft('config.social', '社交链接'), color: 'bg-pink-500', children: <SocialConfig config={config.social} onChange={handleSocialChange} /> },
    { title: ft('config.authorStatus', '作者卡片'), color: 'bg-rose-500', children: <AuthorStatusConfig config={config.authorStatus} onChange={handleAuthorStatusChange} /> },
    { title: ft('config.cover', '封面设置'), color: 'bg-teal-500', children: <CoverConfig config={config.cover} onChange={handleCoverChange} /> },
    { title: ft('config.errorImg', '错误图片'), color: 'bg-red-500', children: <ErrorImgConfig config={config.errorImg} onChange={handleErrorImgChange} /> },
    { title: ft('config.postMeta', '文章元信息'), color: 'bg-violet-500', children: <PostMetaConfig config={config.postMeta} onChange={handlePostMetaChange} /> },
    { title: ft('config.wordcount', '字数统计'), color: 'bg-orange-600', children: <WordCountConfig config={config.wordcount} onChange={handleWordcountChange} /> },
    { title: ft('config.toc', '目录'), color: 'bg-lime-600', children: <TocConfig config={config.toc} onChange={handleTocChange} /> },
    { title: ft('config.copyright', '版权信息'), color: 'bg-blue-600', children: <CopyrightConfig config={config.copyright} onChange={handleCopyrightChange} /> },
    { title: ft('config.reward', '打赏'), color: 'bg-yellow-600', children: <RewardConfig config={config.reward} onChange={handleRewardChange} /> },
    { title: ft('config.postEdit', '在线编辑'), color: 'bg-sky-600', children: <PostEditConfig config={config.postEdit} onChange={handlePostEditChange} /> },
    { title: ft('config.share', '分享'), color: 'bg-green-500', children: <ShareConfig config={config.share} onChange={handleShareChange} /> },
    { title: ft('config.mainTone', '主色调'), color: 'bg-purple-500', children: <MainToneConfig config={config.mainTone} onChange={handleMainToneChange} /> },
    { title: ft('config.footer', '页脚'), color: 'bg-zinc-600', children: <FooterConfig config={config.footer} onChange={handleFooterChange} /> },
  ];

  return (
    <>
      <ConfigSection title={t('config.general')} color="bg-emerald-500">
        <SiteConfigForm config={config.site} onChange={handleSiteChange} />
      </ConfigSection>

      <ConfigSection title={t('config.auth')} icon={Settings} color="bg-amber-500">
        <ToggleField
          label={t('config.allowRegistration')}
          description={t('config.allowRegistrationHint')}
          checked={config.auth.allowRegistration}
          onChange={handleAuthChange}
        />
      </ConfigSection>

      <AccessControlSection
        title={ft('config.accessControl', '访问控制')}
        items={accessItems}
        isPublic={isAccessPublic}
        onToggle={handleAccessToggle}
        publicLabel={ft('config.accessPublic', '公开')}
        privateLabel={ft('config.accessPrivate', '私有（默认全部）')}
      />

      <ConfigSection title={t('config.background')} color="bg-blue-500">
        <BackgroundConfig
          config={config.appearance.background}
          onChange={handleBgChange}
          urlLabel={t('config.backgroundUrl')}
          opacityLabel={t('config.overlayOpacity')}
        />
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <FormField
            label="全局基础字号（px）"
            value={String(config.appearance.fontSize ?? 15)}
            onChange={handleFontSizeChange}
            type="text"
            placeholder="15"
          />
          <p className="text-xs text-zinc-400 mt-1">设置 10-30 之间的值，默认 15。保存后刷新页面生效。</p>
        </div>
      </ConfigSection>

      {simpleSections.map(renderSimpleSection)}

      <LoadingAnimationsSection
        config={config}
        onPageLoadingChange={handlePageLoadingChange}
        onNavLoadingChange={handleNavLoadingChange}
        onSlogansChange={handleSlogansChange}
      />
    </>
  );
}
