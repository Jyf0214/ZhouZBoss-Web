'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Form, message } from 'antd';
import { ChevronRight, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import { useI18n } from '@/hooks/use-i18n';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const inputRef = useRef<any>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!token) {
      message.error(t('auth.invalidToken'));
      router.push('/login');
    }
    inputRef.current?.focus();
  }, [token, router, t]);

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (loading || !token) return;
    if (values.password !== values.confirmPassword) {
      message.error(t('validation.passwordMismatch'));
      return;
    }
    if (values.password.length < 6) {
      message.error(t('validation.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        setResetSuccess(true);
        message.success(t('auth.resetSuccess'));
      } else {
        message.error(data.error || t('auth.resetFailed'));
      }
    } catch (error) {
      message.error(t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '14px 16px',
    height: 56,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 12,
  };

  if (resetSuccess) {
    return (
      <AuthLayout>
        <AuthCard
          footer={
            <Flexbox horizontal justify="center" gap={8} paddingBlock={24}>
              <Link href="/login">
                <Button icon={<Icon icon={ArrowLeft} />} size="large">
                  {t('auth.backToLogin')}
                </Button>
              </Link>
            </Flexbox>
          }
          subtitle={t('auth.loginSubtitle')}
          title={t('auth.resetSuccess')}
        >
          <Flexbox align="center" gap={16} padding={24} style={{
            background: 'var(--ant-color-success-bg)',
            borderRadius: 12,
            border: '1px solid var(--ant-color-success-border)'
          }}>
            <Icon icon={CheckCircle} size={32} style={{ color: 'var(--ant-color-success)' }} />
            <Text style={{ fontSize: 16 }}>{t('auth.resetSuccess')}</Text>
          </Flexbox>
          <Link href="/login">
            <Button type="primary" size="large" block style={{ marginTop: 24 }}>
              {t('auth.login')}
            </Button>
          </Link>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard
        footer={
          <Flexbox horizontal justify="center" gap={8} paddingBlock={24}>
            <Link href="/login">
              <Button icon={<Icon icon={ArrowLeft} />} size="large">
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </Flexbox>
        }
        subtitle={t('auth.resetPasswordSubtitle')}
        title={t('auth.resetPasswordTitle')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="password"
            style={{ marginBottom: 16 }}
            rules={[
              { required: true, message: t('validation.required') },
              { min: 6, message: t('validation.passwordTooShort') }
            ]}
          >
            <Input.Password
              placeholder={t('auth.newPassword')}
              ref={inputRef}
              size="large"
              prefix={<Icon icon={Lock} style={{ marginInline: 8 }} />}
              style={inputStyle}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            style={{ marginBottom: 0 }}
            rules={[
              { required: true, message: t('validation.required') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('validation.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder={t('auth.confirmNewPassword')}
              size="large"
              prefix={<Icon icon={Lock} style={{ marginInline: 8 }} />}
              style={inputStyle}
              suffix={
                <Button
                  icon={<Icon icon={ChevronRight} />}
                  loading={loading}
                  disabled={loading}
                  title={t('auth.resetPassword')}
                  variant="filled"
                  onClick={() => form.submit()}
                />
              }
            />
          </Form.Item>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}

function ResetPasswordLoading() {
  const { t } = useI18n();
  return <div>{t('common.loading')}</div>;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
