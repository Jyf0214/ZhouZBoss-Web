'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input, Form, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { ChevronRight, Key, Lock, Mail } from 'lucide-react';
import { useAuth, TwoFactorRequiredError } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { GlobalLoading } from '@/components/Loading';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

/**
 * 清洗 callbackUrl — 仅允许相对路径，防止开放重定向
 */
function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return '/dashboard';
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('://')) {
    return '/dashboard';
  }
  return url;
}

/**
 * 登录表单 — 三种方式:账号密码 / API 密钥 / Clerk
 */
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password' | 'apikey'>('email');
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const [apiKeyForm] = Form.useForm();
  const inputRef = useRef<React.ComponentRef<typeof Input>>(null);
  const { t } = useI18n();

  const callbackUrl = sanitizeCallbackUrl(searchParams?.get('callbackUrl'));
  const clerkAvailable = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleCheckUser = (values: { login: string }) => {
    setEmail(values.login);
    setStep('password');
  };

  const handleLogin = async (values: { password: string }) => {
    setLoading(true);
    try {
      await login(email, values.password);
      router.push(callbackUrl);
    } catch (err) {
      // 2FA 需求：跳转到 2FA 验证页面
      if (err instanceof TwoFactorRequiredError) {
        // tempToken 已通过 httpOnly cookie 传递，无需暴露在 URL 中
        router.push(`/login/2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      // useAuth 内部已处理其他错误提示
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyLogin = async (values: { key: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/apikey-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: values.key.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        message.success('登录成功');
        router.push(callbackUrl);
      } else {
        message.error(data.error ?? '登录失败');
      }
    } catch {
      message.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
  };

  const inputStyle = {
    padding: '14px 16px',
    height: 56,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 12,
  };

  const clerkSection = clerkAvailable ? (
    <ClerkAuthProvider>
      <ClerkLoginSection />
    </ClerkAuthProvider>
  ) : null;

  const renderEmailStep = () => (
    <AuthCard
      footer={
        <div className="flex flex-col items-center gap-4 mt-4">
          <button
            type="button"
            onClick={() => setStep('apikey')}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <Key size={14} />
            {t('auth.loginWithApiKey') || '使用 API 密钥登录'}
          </button>
          <Link href="/forgot-password">
            <span className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-600">
              {t('auth.forgotPassword')}
            </span>
          </Link>
        </div>
      }
      subtitle={t('auth.loginSubtitle')}
      title={t('auth.welcomeBack')}
    >
      <Form form={form} layout="vertical" onFinish={handleCheckUser}>
        <Form.Item
          name="login"
          style={{ marginBottom: 0 }}
          rules={[{ required: true, message: t('auth.inputEmailOrUsername') }]}
        >
          <Input
            placeholder={t('auth.inputEmailOrUsername')}
            ref={inputRef}
            size="large"
            prefix={<Mail size={16} className="mx-2 text-zinc-400" />}
            style={inputStyle}
            suffix={
              <Button
                icon={<ChevronRight size={14} />}
                loading={loading}
                title={t('auth.nextStep')}
                variant="filled"
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
      {clerkSection}
    </AuthCard>
  );

  const renderPasswordStep = () => (
    <AuthCard
      footer={
        <div className="flex flex-col gap-4">
          <Link href="/forgot-password">
            <span className="text-sm cursor-pointer" style={{ color: 'var(--ant-color-primary)' }}>
              {t('auth.forgotPassword')}
            </span>
          </Link>
          <Button
            icon={<ChevronRight size={14} className="rotate-180" />}
            size="lg"
            autoLoading={false}
            onClick={handleBackToEmail}
          >
            {t('common.back')}
          </Button>
        </div>
      }
      subtitle={t('auth.inputPasswordToLogin')}
      title={t('auth.welcomeBack')}
    >
      <span className="text-lg text-zinc-900">{email}</span>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={handleLogin}>
        <Form.Item
          name="password"
          rules={[{ required: true, message: t('auth.inputPassword') }]}
          style={{ marginBottom: 0 }}
        >
          <Input.Password
            placeholder={t('auth.inputPassword')}
            ref={inputRef}
            size="large"
            prefix={<Lock size={16} className="mx-2 text-zinc-400" />}
            style={inputStyle}
            suffix={
              <Button
                icon={<ChevronRight size={14} />}
                loading={loading}
                title={t('auth.login')}
                variant="filled"
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
      {clerkSection}
    </AuthCard>
  );

  const renderApiKeyStep = () => (
    <AuthCard
      footer={
        <div className="flex flex-col items-center gap-4 mt-4">
          <Button
            icon={<ChevronRight size={14} className="rotate-180" />}
            size="lg"
            autoLoading={false}
            onClick={handleBackToEmail}
          >
            {t('common.back')}
          </Button>
        </div>
      }
      subtitle={t('auth.apiKeyLoginSubtitle') || '输入 sk-xxx 格式的 API 密钥'}
      title={t('auth.apiKeyLoginTitle') || 'API 密钥登录'}
    >
      <Form form={apiKeyForm} layout="vertical" onFinish={handleApiKeyLogin}>
        <Form.Item
          name="key"
          rules={[{ required: true, message: t('auth.inputApiKey') || '请输入 API 密钥' }]}
          style={{ marginBottom: 0 }}
        >
          <Input
            placeholder="sk-..."
            ref={inputRef}
            size="large"
            prefix={<Key size={16} className="mx-2 text-zinc-400" />}
            style={inputStyle}
            suffix={
              <Button
                icon={<ChevronRight size={14} />}
                loading={loading}
                title={t('auth.login')}
                variant="filled"
                onClick={() => apiKeyForm.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
    </AuthCard>
  );

  return (
    <AuthLayout>
      {step === 'email' && renderEmailStep()}
      {step === 'password' && renderPasswordStep()}
      {step === 'apikey' && renderApiKeyStep()}
    </AuthLayout>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<GlobalLoading tip={t('common.loading')} />}>
      <LoginForm />
    </Suspense>
  );
}
