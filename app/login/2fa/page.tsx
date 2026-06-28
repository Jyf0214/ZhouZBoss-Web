'use client';

import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Form, message } from 'antd';
import { Button } from '@/components/ui/Button';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { GlobalLoading } from '@/components/Loading';
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
 * 2FA 验证页面 — 在密码验证通过后要求输入 TOTP 验证码
 */
function TwoFactorForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const inputRef = useRef<React.ComponentRef<typeof Input>>(null);

  const callbackUrl = sanitizeCallbackUrl(searchParams?.get('callbackUrl'));
  const tempToken = searchParams?.get('tempToken') ?? '';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 如果没有临时令牌，说明直接访问了此页面，重定向到登录页
  useEffect(() => {
    if (!tempToken) {
      message.error('请先通过密码验证');
      router.replace('/login');
    }
  }, [tempToken, router]);

  const handleVerify = useCallback(async (values: { code: string }) => {
    if (!tempToken) {
      message.error('临时令牌缺失，请重新登录');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: values.code,
          tempToken,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        message.success('验证成功');
        router.push(callbackUrl);
      } else {
        message.error(data.error ?? '验证失败');
      }
    } catch {
      message.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  }, [tempToken, callbackUrl, router]);

  const inputStyle = {
    padding: '14px 16px',
    height: 56,
    fontSize: 16,
    lineHeight: 1.6,
    borderRadius: 12,
  };

  return (
    <AuthLayout>
      <AuthCard
        footer={
          <div className="flex flex-col items-center gap-4 mt-4">
            <Button
              icon={<ChevronRight size={14} className="rotate-180" />}
              size="lg"
              autoLoading={false}
              onClick={() => router.replace('/login')}
            >
              返回登录
            </Button>
          </div>
        }
        subtitle="请输入验证器 App 中显示的 6 位验证码"
        title="双因素认证"
      >
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={24} className="text-zinc-500" />
          <span className="text-sm text-zinc-500">
            打开 Google Authenticator、Microsoft Authenticator 或其他验证器 App
          </span>
        </div>

        <Form form={form} layout="vertical" onFinish={handleVerify}>
          <Form.Item
            name="code"
            style={{ marginBottom: 0 }}
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码必须为 6 位数字' },
              { pattern: /^\d{6}$/, message: '验证码必须为 6 位数字' },
            ]}
          >
            <Input
              placeholder="000000"
              ref={inputRef}
              size="large"
              maxLength={6}
              style={{
                ...inputStyle,
                textAlign: 'center',
                fontSize: 24,
                letterSpacing: '0.5em',
                fontFamily: 'monospace',
              }}
              suffix={
                <Button
                  icon={<ChevronRight size={14} />}
                  loading={loading}
                  title="验证"
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

export default function TwoFactorLoginPage() {
  return (
    <Suspense fallback={<GlobalLoading tip="加载中..." />}>
      <TwoFactorForm />
    </Suspense>
  );
}
