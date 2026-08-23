'use client';

import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { GlobalLoading } from '@/components/Loading';
import ConfigSection from '@/components/ui/ConfigSection';
import { SettingsPageHeader } from './SettingsPageHeader';
import { SettingsForm } from './SettingsForm';
import { ApiKeyCard } from './ApiKeyCard';
import { TwoFactorCard } from './TwoFactorCard';
import { ChangePasswordCard } from './ChangePasswordCard';
import { useConfigData } from '../_lib/use-config-data';
import { useSettingsForm } from '../_lib/use-settings-form';
import { useSettingsSave } from '../_lib/use-settings-save';

/**
 * 设置页主容器：负责装配数据 hook + 子组件，等待页面就绪后渲染表单。
 */
export function SettingsPageContent() {
  const { user, isRoot } = useAuth();
  const { t } = useI18n();

  // /api/config 为 root-only 接口：非 root 不发起请求，避免每次进设置页必弹 403
  const { configData, configLoaded, githubConfigured } = useConfigData({ enabled: isRoot });
  const { form, originalAvatar, pageReady } = useSettingsForm({
    user,
    configData,
    configLoaded,
  });
  const { loading, DiffModal, handleSave } = useSettingsSave({
    uid: user?.uid,
    originalAvatar,
    githubConfigured,
    userName: user?.name ?? user?.uid ?? '',
  });

  if (!pageReady) {
    return <GlobalLoading />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <SettingsPageHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
        />
        <ConfigSection title={t('settings.title')} color="bg-zinc-500">
          <SettingsForm form={form} loading={loading} onSubmit={handleSave} />
        </ConfigSection>
        <ApiKeyCard />
        <TwoFactorCard />
        <ChangePasswordCard />
        {DiffModal}
      </div>
    </div>
  );
}
