'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Form, message } from 'antd';
import { showError } from '@/lib/error';
import { ChevronRight, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import AuthCard from '@/components/AuthCard';
import { GlobalLoading } from '@/components/Loading';
import AuthLayout from '@/components/AuthLayout';

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const inputRef = useRef<React.ComponentRef<typeof Input>>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!token) {
      showError(t('auth.invalidToken'));
      router.push('/login');
    }
    inputRef.current?.focus();
  }, [token, router, t]);

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (loading || !token) return;
    if (values.password !== values.confirmPassword) {
      showError(t('validation.passwordMismatch'));
      return;
    }
    if (values.password.length < 6) {
      showError(t('validation.passwordTooShort'));
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
        showError(data.error || t('auth.resetFailed'));
      }
  } catch {
    showError(t('auth.resetFailed'));
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
            <div className="flex items-center justify-center gap-2 py-6">
              <Link href="/login">
                <Button icon={<ArrowLeft size={14} />} size="large">
                  {t('auth.backToLogin')}
                </Button>
              </Link>
            </div>
          }
          subtitle={t('auth.loginSubtitle')}
          title={t('auth.resetSuccess')}
        >
          <div className="flex items-center gap-4 p-6 rounded-xl" style={{ background: 'var(--ant-color-success-bg)', border: '1px solid var(--ant-color-success-border)' }}>
            <CheckCircle size={32} style={{ color: 'var(--ant-color-success)' }} />
            <span className="text-base">{t('auth.resetSuccess')}</span>
          </div>
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
          <div className="flex items-center justify-center gap-2 py-6">
            <Link href="/login">
              <Button icon={<ArrowLeft size={14} />} size="large">
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        }
        subtitle={t('auth.resetPasswordSubtitle')}
        title={t('auth.resetPasswordTitle')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="password" style={{ marginBottom: 16 }} rules={[
            { required: true, message: t('validation.required') },
            { min: 6, message: t('validation.passwordTooShort') },
          ]}>
            <Input.Password placeholder={t('auth.newPassword')} ref={inputRef} size="large" prefix={<Lock size={16} className="mx-2 text-zinc-400" />} style={inputStyle} />
          </Form.Item>
          <Form.Item name="confirmPassword" style={{ marginBottom: 0 }} rules={[
            { required: true, message: t('validation.required') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error(t('validation.passwordMismatch')));
              },
            }),
          ]}>
            <Input.Password
              placeholder={t('auth.confirmNewPassword')}
              size="large"
              prefix={<Lock size={16} className="mx-2 text-zinc-400" />}
              style={inputStyle}
              suffix={
                <Button icon={<ChevronRight size={14} />} loading={loading} disabled={loading} title={t('auth.resetPassword')} variant="filled" onClick={() => form.submit()} />
              }
            />
          </Form.Item>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}

function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <GlobalLoading size="large" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
