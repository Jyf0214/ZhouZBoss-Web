/**
 * Sign Up Page
 * 
 * 注册页面 - 复制自 LobeChat
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
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

const SignUpPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (values: { email: string; password: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      if (values.password !== values.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: values.email.split('@')[0],
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/login');
      } else {
        throw new Error(data.error || data.message || '注册失败');
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      alert(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <Text fontSize={13} type={'secondary'}>
      注册即表示您同意我们的服务条款和隐私政策
    </Text>
  );

  return (
    <AuthLayout>
      <AuthCard
        footer={footer}
        subtitle={`加入 ${BRANDING_NAME}`}
        title="创建账号"
      >
        <Form form={form} layout="vertical" onFinish={handleSignUp}>
          <Form.Item
            name="email"
            rules={[
              { message: '请输入电子邮箱', required: true },
              { message: '请输入有效的电子邮箱地址', type: 'email' },
            ]}
          >
            <Input
              placeholder="your@email.com"
              size="large"
              prefix={
                <Icon
                  icon={Mail}
                  style={{
                    marginInline: 8,
                  }}
                />
              }
              style={{
                padding: 12,
                height: 52,
                fontSize: 16,
                lineHeight: 1.5,
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { message: '请输入密码', required: true },
              { message: '密码至少 8 个字符', min: 8 },
              { max: 64, message: '密码最多 64 个字符' },
            ]}
          >
            <AntInput.Password
              placeholder="请输入密码"
              size="large"
              prefix={
                <Icon
                  icon={Lock}
                  style={{
                    marginInline: 8,
                  }}
                />
              }
              style={{
                padding: 12,
                height: 52,
                fontSize: 16,
                lineHeight: 1.5,
              }}
            />
          </Form.Item>

          <Form.Item
            dependencies={['password']}
            name="confirmPassword"
            rules={[
              { message: '请确认您的密码', required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <AntInput.Password
              placeholder="再次输入密码"
              size="large"
              prefix={
                <Icon
                  icon={Lock}
                  style={{
                    marginInline: 8,
                  }}
                />
              }
              style={{
                padding: 12,
                height: 52,
                fontSize: 16,
                lineHeight: 1.5,
              }}
            />
          </Form.Item>

          <Form.Item>
            <Button block htmlType="submit" loading={loading} size="large" type="primary">
              立即注册
            </Button>
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
            已有账号？
          </Text>
          <Link href="/login">
            <Text style={{ fontSize: 14, fontWeight: 500 }}>
              立即登录
            </Text>
          </Link>
        </Flexbox>
      </AuthCard>
    </AuthLayout>
  );
};

export default SignUpPage;
