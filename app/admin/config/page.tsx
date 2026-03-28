'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Settings, Github, ExternalLink, CheckCircle, XCircle, Image } from 'lucide-react';
import { Icon, Text } from '@lobehub/ui';
import { Slider } from 'antd';

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
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">{t('common.loading')}</Text>
      </div>
    );
  }

  if (userRole !== 'sudo' && userRole !== 'admin') {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text style={{ color: 'var(--ant-color-error)' }}>
          {t('common.accessDenied')}
        </Text>
      </div>
    );
  }

  const isGithubConfigured = config.githubRepo && config.githubToken;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#1a1a1a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon icon={Settings} />
        </div>
        <div>
          <Text fontSize={24} weight={'bold'}>
            {t('config.title')}
          </Text>
          <Text fontSize={14} type="secondary">
            {t('config.subtitle')}
          </Text>
        </div>
      </div>

      {/* 基础设置 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        padding: 20,
        marginBottom: 16,
      }}>
        <Text fontSize={16} weight={'bold'} style={{ marginBottom: 16, display: 'block' }}>
          <span style={{ 
            display: 'inline-block',
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: '#52c41a',
            marginRight: 8 
          }}></span>
          {t('config.general')}
        </Text>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {t('config.siteTitle')}
          </label>
          <input 
            type="text" 
            value={config.siteTitle}
            onChange={e => setConfig({...config, siteTitle: e.target.value})}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {t('config.siteDescription')}
          </label>
          <textarea 
            value={config.siteDescription}
            onChange={e => setConfig({...config, siteDescription: e.target.value})}
            style={{
              width: '100%',
              minHeight: 100,
              padding: 12,
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* 背景设置 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        padding: 20,
        marginBottom: 16,
      }}>
        <Text fontSize={16} weight={'bold'} style={{ marginBottom: 16, display: 'block' }}>
          <span style={{ 
            display: 'inline-block',
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: '#1890ff',
            marginRight: 8 
          }}></span>
          <Icon icon={Image} style={{ marginRight: 8 }} />
          {t('config.background')}
        </Text>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {t('config.backgroundUrl')}
          </label>
          <input 
            type="text" 
            value={config.background?.url || ''}
            onChange={e => setConfig({
              ...config, 
              background: { ...config.background, url: e.target.value }
            })}
            placeholder={t('config.backgroundUrlPlaceholder')}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <Text fontSize={12} type="secondary" style={{ marginTop: 4, display: 'block' }}>
            {t('config.backgroundUrlHint')}
          </Text>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {t('config.overlayOpacity')}: {Math.round((config.background?.opacity ?? 0.8) * 100)}%
          </label>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={config.background?.opacity ?? 0.8}
            onChange={value => setConfig({
              ...config, 
              background: { ...config.background, opacity: value }
            })}
            tooltip={{ formatter: (value) => `${Math.round((value ?? 0) * 100)}%` }}
          />
          <Text fontSize={12} type="secondary" style={{ marginTop: 4, display: 'block' }}>
            {t('config.overlayOpacityHint')}
          </Text>
        </div>
      </div>

      {/* GitHub 集成状态 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        padding: 20,
        marginBottom: 24,
      }}>
        <Text fontSize={16} weight={'bold'} style={{ marginBottom: 16, display: 'block' }}>
          <Icon icon={Github} style={{ marginRight: 8 }} />
          {t('config.github')}
        </Text>
        
        {/* 状态指示 */}
        <div style={{
          padding: 16,
          background: isGithubConfigured ? '#f6ffed' : '#fff7e6',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Icon 
            icon={isGithubConfigured ? CheckCircle : XCircle} 
            style={{ 
              fontSize: 20, 
              color: isGithubConfigured ? '#52c41a' : '#faad14' 
            }} 
          />
          <div>
            <Text weight={500}>
              {isGithubConfigured 
                ? t('config.githubConfigured')
                : t('config.githubNotConfigured')
              }
            </Text>
            <Text fontSize={13} type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {isGithubConfigured
                ? t('config.githubRepo') + ': ' + config.githubRepo
                : t('config.githubHint')
              }
            </Text>
          </div>
        </div>

        {/* 环境变量说明 */}
        <div style={{
          padding: 16,
          background: '#f5f5f5',
          borderRadius: 8,
        }}>
          <Text fontSize={14} weight={500} style={{ marginBottom: 12, display: 'block' }}>
            {t('config.envVars')}
          </Text>
          <div style={{ marginBottom: 8 }}>
            <code style={{ 
              background: '#e6e6e6', 
              padding: '2px 8px', 
              borderRadius: 4,
              fontSize: 13,
            }}>
              GITHUB_REPO
            </code>
            <Text fontSize={13} type="secondary" style={{ marginLeft: 8 }}>
              {t('config.githubRepoFormat')}
            </Text>
          </div>
          <div>
            <code style={{ 
              background: '#e6e6e6', 
              padding: '2px 8px', 
              borderRadius: 4,
              fontSize: 13,
            }}>
              GITHUB_TOKEN
            </code>
            <Text fontSize={13} type="secondary" style={{ marginLeft: 8 }}>
              {t('config.githubTokenHint')}
            </Text>
          </div>
          <div style={{ marginTop: 12 }}>
            <a 
              href="https://vercel.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#1890ff',
                fontSize: 13,
              }}
            >
              {t('config.goToVercel')}
              <Icon icon={ExternalLink} style={{ fontSize: 12 }} />
            </a>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            background: '#1a1a1a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Icon icon={Settings} />
          <span>{saving 
            ? t('config.saving')
            : t('config.save')
          }</span>
        </button>
      </div>
    </div>
  );
}