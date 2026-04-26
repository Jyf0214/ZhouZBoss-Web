'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Form, message } from 'antd';
import { ChevronRight, Lock, Mail } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

/**
 * 登录表单 — 两步流程：先输入邮箱/用户名，再输入密码
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  /** 第一步：验证用户标识，进入密码输入 */
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

  /** 第二步：提交密码完成登录 */
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

  /** 返回邮箱输入步骤 */
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

  /** 邮箱/用户名输入步骤 */
  const renderEmailStep = () => (
    <AuthCard
      footer={
        <Flexbox gap={16} align="center" style={{ marginTop: 16 }}>
          <Link href="/forgot-password">
            <Text style={{ fontSize: 14, color: 'var(--ant-color-text-secondary)', cursor: 'pointer' }}>
              {t('auth.forgotPassword')}
            </Text>
          </Link>
          <Flexbox horizontal justify="center" gap={8}>
            <Text type="secondary" style={{ fontSize: 14, lineHeight: '22px' }}>
              {t('auth.noAccount')}
            </Text>
            <Link href="/register">
              <Text style={{ fontSize: 14, fontWeight: 500, lineHeight: '22px' }}>
                {t('auth.registerNow')}
              </Text>
            </Link>
          </Flexbox>
        </Flexbox>
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
            prefix={<Icon icon={Mail} style={{ marginInline: 8 }} />}
            style={inputStyle}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
                loading={loading}
                title={t('auth.nextStep')}
                variant={'filled'}
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>
    </AuthCard>
  );

  /** 密码输入步骤 */
  const renderPasswordStep = () => (
    <AuthCard
      footer={
        <Flexbox gap={16}>
          <Link href="/forgot-password">
            <Text style={{ fontSize: 14, color: 'var(--ant-color-primary)', cursor: 'pointer' }}>
              {t('auth.forgotPassword')}
            </Text>
          </Link>
          <Button
            icon={<Icon icon={ChevronRight} style={{ transform: 'rotate(180deg)' }} />}
            size={'large'}
            onClick={handleBackToEmail}
          >
            {t('common.back')}
          </Button>
        </Flexbox>
      }
      subtitle={t('auth.inputPasswordToLogin')}
      title={t('auth.welcomeBack')}
    >
      <Text fontSize={18} style={{ lineHeight: '28px' }}>{email}</Text>
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
            prefix={<Icon icon={Lock} style={{ marginInline: 8 }} />}
            style={inputStyle}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
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
