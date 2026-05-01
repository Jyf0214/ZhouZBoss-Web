'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Settings, Github, ExternalLink, CheckCircle, XCircle, Image } from 'lucide-react';
import { Slider, Button } from 'antd';

interface BackgroundConfig {
  url?: string;
  opacity?: number;
}

interface EnvStatus {
  siteTitle: string;
  siteDescription: string;
  background: BackgroundConfig;
  githubRepo: string;
  githubToken: string;
}

export default function ConfigPage() {
  const { userRole } = useAuth();
  const { t } = useI18n();
  const [config, setConfig] = useState<EnvStatus>({
    siteTitle: '',
    siteDescription: '',
    background: { url: '', opacity: 0.8 },
    githubRepo: '',
    githubToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
            siteTitle: data.siteTitle || 'Originium Kernel',
            siteDescription: data.siteDescription || '',
            background: data.background || { url: '', opacity: 0.8 },
            githubRepo: data.githubRepo || '',
            githubToken: data.githubToken ? '********' : '',
          });
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [userRole]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteTitle: config.siteTitle,
          siteDescription: config.siteDescription,
          background: config.background,
        }),
      });
      if (res.ok) {
        alert(t('config.saveSuccess'));
      } else {
        alert(t('config.saveFailed'));
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert(t('config.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <span className="text-zinc-400">{t('common.loading')}</span>
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

  const isGithubConfigured = config.githubRepo && config.githubToken;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('config.title')}</h1>
          <p className="text-sm text-zinc-400">{t('config.subtitle')}</p>
        </div>
      </div>

      {/* 基础设置 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t('config.general')}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('config.siteTitle')}</label>
          <input
            type="text"
            value={config.siteTitle}
            onChange={e => setConfig({ ...config, siteTitle: e.target.value })}
            className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('config.siteDescription')}</label>
          <textarea
            value={config.siteDescription}
            onChange={e => setConfig({ ...config, siteDescription: e.target.value })}
            className="w-full min-h-[100px] p-3 border border-zinc-200 rounded-lg text-sm resize-vertical outline-none focus:border-zinc-400 transition-colors"
          />
        </div>
      </div>

      {/* 背景设置 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-4">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <Image size={16} />
          {t('config.background')}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('config.backgroundUrl')}</label>
          <input
            type="text"
            value={config.background?.url || ''}
            onChange={e => setConfig({ ...config, background: { ...config.background, url: e.target.value } })}
            placeholder={t('config.backgroundUrlPlaceholder')}
            className="w-full h-10 px-3 border border-zinc-200 rounded-lg text-sm outline-none focus:border-zinc-400 transition-colors"
          />
          <p className="text-xs text-zinc-400 mt-1">{t('config.backgroundUrlHint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('config.overlayOpacity')}: {Math.round((config.background?.opacity ?? 0.8) * 100)}%
          </label>
          <Slider
            min={0} max={1} step={0.05}
            value={config.background?.opacity ?? 0.8}
            onChange={value => setConfig({ ...config, background: { ...config.background, opacity: value } })}
            tooltip={{ formatter: (value) => `${Math.round((value ?? 0) * 100)}%` }}
          />
          <p className="text-xs text-zinc-400 mt-1">{t('config.overlayOpacityHint')}</p>
        </div>
      </div>

      {/* GitHub 集成状态 */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6">
        <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Github size={16} />
          {t('config.github')}
        </h2>
        <div className="p-4 rounded-xl mb-4 flex items-center gap-3" style={{ background: isGithubConfigured ? '#f6ffed' : '#fff7e6' }}>
          {isGithubConfigured ? (
            <CheckCircle size={20} style={{ color: '#52c41a' }} />
          ) : (
            <XCircle size={20} style={{ color: '#faad14' }} />
          )}
          <div>
            <span className="font-medium text-sm">
              {isGithubConfigured ? t('config.githubConfigured') : t('config.githubNotConfigured')}
            </span>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isGithubConfigured ? t('config.githubRepo') + ': ' + config.githubRepo : t('config.githubHint')}
            </p>
          </div>
        </div>
        <div className="p-4 bg-zinc-50 rounded-xl">
          <span className="text-sm font-medium block mb-3">{t('config.envVars')}</span>
          <div className="mb-2">
            <code className="bg-zinc-200 px-2 py-0.5 rounded text-xs font-mono">GITHUB_REPO</code>
            <span className="text-xs text-zinc-400 ml-2">{t('config.githubRepoFormat')}</span>
          </div>
          <div>
            <code className="bg-zinc-200 px-2 py-0.5 rounded text-xs font-mono">GITHUB_TOKEN</code>
            <span className="text-xs text-zinc-400 ml-2">{t('config.githubTokenHint')}</span>
          </div>
          <div className="mt-3">
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600">
              {t('config.goToVercel')} <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          icon={<Settings size={14} />}
          type="primary"
          className="bg-zinc-900 hover:bg-zinc-800 rounded-xl h-10 px-8"
        >
          {saving ? t('config.saving') : t('config.save')}
        </Button>
      </div>
    </div>
  );
}
