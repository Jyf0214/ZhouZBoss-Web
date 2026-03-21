/**
 * Sign In Page
 * 
 * 登录页面 - 复制自 LobeChat
 * 
 * @see https://github.com/lobehub/lobe-chat - branch: canary, commit: 81bd6dc
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */
'use client';

import { BRANDING_NAME } from '@/const/branding';
import { Button, Flexbox, Icon, Input, Text } from '@lobehub/ui';
import { Form, Input as AntInput } from 'antd';
import { ChevronRight, Lock, Mail } from 'lucide-react';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';

import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';
import { PRIVACY_URL, TERMS_URL } from '@/const/url';

type Step = 'email' | 'password';

const SignInEmailStep = ({
  form,
  loading,
  onCheckUser,
}: {
  form: any;
  loading: boolean;
  onCheckUser: (values: { email: string }) => Promise<void>;
}) => {
  const emailInputRef = useRef<any>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const footer = (
    <Text fontSize={13} type={'secondary'}>
      登录即表示您同意我们的{' '}
      <a href={TERMS_URL} style={{ color: 'inherit', textDecoration: 'underline' }}>
        服务条款
      </a>
      {' '}和{' '}
      <a href={PRIVACY_URL} style={{ color: 'inherit', textDecoration: 'underline' }}>
        隐私政策
      </a>
    </Text>
  );

  return (
    <AuthCard
      footer={footer}
      subtitle={`登录以管理您的 ${BRANDING_NAME}`}
      title="Agent teammates that grow with you"
    >
      <Form form={form} layout="vertical" onFinish={onCheckUser}>
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱或用户名' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
          style={{ marginBottom: 0 }}
        >
          <Input
            placeholder="请输入邮箱"
            ref={emailInputRef}
            size="large"
            prefix={
              <Icon
                icon={Mail}
                style={{
                  marginInline: 6,
                }}
              />
            }
            style={{
              padding: 6,
            }}
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
        <Text type="secondary" style={{ fontSize: 14 }}>
          还没有账号？
        </Text>
        <a href="/register">
          <Text style={{ fontSize: 14, fontWeight: 500 }}>
            立即注册
          </Text>
        </a>
      </Flexbox>
    </AuthCard>
  );
};

const SignInPasswordStep = ({
  email,
  form,
  loading,
  onBackToEmail,
  onSubmit,
}: {
  email: string;
  form: any;
  loading: boolean;
  onBackToEmail: () => void;
  onSubmit: (values: { password: string }) => Promise<void>;
}) => {
  const passwordInputRef = useRef<any>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  return (
    <AuthCard
      subtitle="输入密码完成登录"
      title="Agent teammates that grow with you"
      footer={
        <>
          <Button
            icon={<Icon icon={ChevronRight} style={{ transform: 'rotate(180deg)' }} />}
            size={'large'}
            style={{ marginTop: 16 }}
            onClick={onBackToEmail}
          >
            返回上一步
          </Button>
        </>
      }
    >
      <Text fontSize={20}>{email}</Text>
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 12 }}
        onFinish={onSubmit}
      >
        <Form.Item
          name="password"
          rules={[{ message: '请输入密码', required: true }]}
          style={{ marginBottom: 0 }}
        >
          <AntInput.Password
            placeholder="请输入密码"
            ref={passwordInputRef}
            size="large"
            prefix={
              <Icon
                icon={Lock}
                style={{
                  marginInline: 6,
                }}
              />
            }
            style={{
              padding: 6,
            }}
            suffix={
              <Button
                icon={<Icon icon={ChevronRight} />}
                loading={loading}
                style={{ color: 'var(--ant-color-primary)' }}
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
};

const SignInPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleCheckUser = async (values: { email: string }) => {
    setLoading(true);
    try {
      setEmail(values.email);
      setStep('password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (values: { password: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: values.password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard');
      } else {
        throw new Error(data.error || data.message || '登录失败');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      alert(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
  };

  return (
    <AuthLayout>
      <Suspense fallback={<div>加载中...</div>}>
        {step === 'email' ? (
          <SignInEmailStep
            form={form}
            loading={loading}
            onCheckUser={handleCheckUser}
          />
        ) : (
          <SignInPasswordStep
            email={email}
            form={form}
            loading={loading}
            onBackToEmail={handleBackToEmail}
            onSubmit={handleSignIn}
          />
        )}
      </Suspense>
    </AuthLayout>
  );
};

export default SignInPage;
