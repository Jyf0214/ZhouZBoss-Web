'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Form, message } from 'antd';
import { ChevronRight, Lock, Mail } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

/**
 * Login Page Component
 * 
 * Complete login flow inspired by LobeChat's sign-in design.
 * Features step-based authentication with clean input styling.
 * 
 * @see https://github.com/lobehub/lobe-chat - UI design reference
 * @copyright LobeChat UI Design
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const inputRef = useRef<any>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleCheckUser = async (values: { email: string }) => {
    setLoading(true);
    try {
      setEmail(values.email);
      setStep('password');
    } catch (error: any) {
      message.error(error.message || '验证用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (values: { password: string }) => {
    setLoading(true);
    try {
      await login(email, values.password);
      message.success('登录成功');
      router.push(callbackUrl);
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
  };

  const renderEmailStep = () => (
    <AuthCard
      footer={
        <Text fontSize={13} type={'secondary'}>
          登录即表示您同意我们的{' '}
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
            服务条款
          </Link>
          {' '}和{' '}
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
            隐私政策
          </Link>
        </Text>
      }
      subtitle="登录以管理您的 Originium Kernel"
      title="欢迎回来"
    >
      <Form form={form} layout="vertical" onFinish={handleCheckUser}>
        <Form.Item
          name="email"
          style={{ marginBottom: 0 }}
          rules={[
            { required: true, message: '请输入邮箱或用户名' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input
            placeholder="请输入邮箱"
            ref={inputRef}
            size="large"
            prefix={
              <Icon icon={Mail} style={{ marginInline: 6 }} />
            }
            style={{ padding: 6 }}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
                loading={loading}
                title="下一步"
                variant={'filled'}
                onClick={() => form.submit()}
              />
            }
          />
        </Form.Item>
      </Form>

      <Flexbox 
        horizontal 
        justify="center" 
        gap={8} 
        paddingBlock={20}
        style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}
      >
        <Text type="secondary" style={{ fontSize: 14 }}>还没有账号？</Text>
        <Link href="/register">
          <Text style={{ fontSize: 14, fontWeight: 500 }}>立即注册</Text>
        </Link>
      </Flexbox>
    </AuthCard>
  );

  const renderPasswordStep = () => (
    <AuthCard
      footer={
        <>
          <Text fontSize={13} type={'secondary'}>
            <Link 
              href="/forgot-password"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              忘记密码？
            </Link>
          </Text>
          <Button
            icon={<Icon icon={ChevronRight} style={{ transform: 'rotate(180deg)' }} />}
            size={'large'}
            style={{ marginTop: 16 }}
            onClick={handleBackToEmail}
          >
            返回上一步
          </Button>
        </>
      }
      subtitle="输入密码完成登录"
      title="欢迎回来"
    >
      <Text fontSize={20}>{email}</Text>
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 12 }}
        onFinish={handleLogin}
      >
        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
          style={{ marginBottom: 0 }}
        >
          <Input.Password
            placeholder="请输入密码"
            ref={inputRef}
            size="large"
            prefix={
              <Icon icon={Lock} style={{ marginInline: 6 }} />
            }
            style={{ padding: 6 }}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
                loading={loading}
                title="登录"
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
