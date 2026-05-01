'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Form, Divider, message } from 'antd';
import { ChevronRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { ClerkAuthProvider } from '@/components/ClerkAuthProvider';
import { ClerkLoginSection } from '@/components/ClerkLoginSection';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

/**
 * 登录表单 — 两步流程：先输入邮箱/用户名，再输入密码
 * 底部可选 Clerk 第三方登录（仅配置了 Clerk 环境变量时显示）
 */
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const inputRef = useRef<any>(null);
  const { t } = useI18n();

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const clerkAvailable = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleCheckUser = async (values: { login: string }) => {
    setLoading(true);
    try {
      setEmail(values.login);
      setStep('password');
    } catch {
      message.error(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (values: { password: string }) => {
    setLoading(true);
    try {
      await login(email, values.password);
      router.push(callbackUrl);
    } catch {
      // useAuth 内部已处理错误提示
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
          <Link href="/forgot-password">
            <span className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-600">
              {t('auth.forgotPassword')}
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-zinc-400">{t('auth.noAccount')}</span>
            <Link href="/register">
              <span className="text-sm font-medium text-zinc-900">{t('auth.registerNow')}</span>
            </Link>
          </div>
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
                variant={'filled'}
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
            size={'large'}
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
                style={{ color: 'var(--ant-color-primary)' }}
                title={t('auth.login')}
                variant={'filled'}
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
      {clerkSection}
    </AuthCard>
  );

  return (
    <AuthLayout>
      {step === 'email' ? renderEmailStep() : renderPasswordStep()}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
