'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Input, Form, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { showError } from '@/lib/error';
import { ChevronRight, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [form] = Form.useForm();
  const inputRef = useRef<React.ComponentRef<typeof Input>>(null);
  const { t } = useI18n();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (values: { email: string }) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        setSentEmail(values.email);
        setEmailSent(true);
        message.success(t('auth.resetLinkSent'));
      } else {
        showError(data.error ?? t('auth.resetLinkFailed'));
      }
  } catch {
    showError(t('auth.resetLinkFailed'));
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

  if (emailSent) {
    return (
      <AuthLayout>
        <AuthCard
          footer={
            <div className="flex items-center justify-center gap-2 py-6">
              <Link href="/login">
                <Button icon={<ArrowLeft size={14} />} size="lg" autoLoading={false}>
                  {t('auth.backToLogin')}
                </Button>
              </Link>
            </div>
          }
          subtitle={t('auth.checkEmail')}
          title={t('auth.emailSent')}
        >
          <div className="flex items-center gap-4 p-6 rounded-xl" style={{ background: 'var(--ant-color-success-bg)', border: '1px solid var(--ant-color-success-border)' }}>
            <CheckCircle size={32} style={{ color: 'var(--ant-color-success)' }} />
            <div>
              <span className="text-base block mb-1">{t('auth.resetLinkSent')}</span>
              <span className="text-sm text-zinc-400">{sentEmail}</span>
            </div>
          </div>
          <Button size="lg" block className="mt-6" autoLoading={false} onClick={() => { setEmailSent(false); form.resetFields(); inputRef.current?.focus(); }}>
            {t('auth.resendEmail')}
          </Button>
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
              <Button icon={<ArrowLeft size={14} />} size="lg" autoLoading={false}>
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        }
        subtitle={t('auth.forgotPasswordSubtitle')}
        title={t('auth.forgotPasswordTitle')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" style={{ marginBottom: 0 }} rules={[
            { required: true, message: t('validation.required') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}>
            <Input
              placeholder={t('auth.inputEmailPlaceholder')}
              ref={inputRef}
              size="large"
              prefix={<Mail size={16} className="mx-2 text-zinc-400" />}
              style={inputStyle}
              suffix={
                <Button icon={<ChevronRight size={14} />} loading={loading} disabled={loading} title={t('auth.sendResetLink')} variant="filled" onClick={() => form.submit()} />
              }
            />
          </Form.Item>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
