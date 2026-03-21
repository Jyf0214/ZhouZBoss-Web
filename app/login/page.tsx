'use client';

import React, { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Form, message, Divider } from 'antd';
import { ChevronRight, Lock, User } from 'lucide-react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import Link from 'next/link';
import { motion } from 'motion/react';
import AuthCard from '@/components/AuthCard';

/**
 * Login Form Component
 * 
 * Inspired by LobeChat's sign-in design with step-based flow.
 * Features clean input design with inline action buttons.
 * 
 * @see https://github.com/lobehub/lobe-chat - UI design reference
 * @copyright LobeChat UI Design
 */
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const usernameInputRef = useRef<any>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      router.push(callbackUrl);
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <Text fontSize={13} type={'secondary'}>
      登录即表示您同意我们的{' '}
      <Link href="/terms" style={{ color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
        服务条款
      </Link>
      {' '}和{' '}
      <Link href="/privacy" style={{ color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
        隐私政策
      </Link>
    </Text>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <AuthCard
        footer={footer}
        subtitle="登录以管理您的 Originium Kernel"
        title="欢迎回来"
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleLogin} 
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            style={{ marginBottom: 0 }}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="请输入用户名"
              ref={usernameInputRef}
              size="large"
              prefix={
                <Icon
                  icon={User}
                  style={{ marginInline: 6 }}
                />
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

          <Divider style={{ margin: '16px 0' }}>
            <Text fontSize={12} type={'secondary'}>
              输入密码完成登录
            </Text>
          </Divider>

          <Form.Item
            name="password"
            style={{ marginBottom: 0 }}
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              placeholder="请输入密码"
              size="large"
              prefix={
                <Icon
                  icon={Lock}
                  style={{ marginInline: 6 }}
                />
              }
              style={{ padding: 6 }}
            />
          </Form.Item>

          <Flexbox horizontal justify="flex-end" paddingBlock={12}>
            <Link href="/forgot-password">
              <Text type="secondary" style={{ fontSize: 13 }}>忘记密码？</Text>
            </Link>
          </Flexbox>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              block 
              htmlType="submit" 
              loading={loading} 
              size="large" 
              type="primary"
            >
              登录
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
          <Text type="secondary" style={{ fontSize: 14 }}>还没有账号？</Text>
          <Link href="/register">
            <Text style={{ fontSize: 14, fontWeight: 500 }}>立即注册</Text>
          </Link>
        </Flexbox>
      </AuthCard>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--ant-color-bg-layout)' }}
    >
      <Flexbox gap={16} style={{ width: '100%', maxWidth: 440 }}>
        {/* 返回按钮 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
            >
              返回首页
            </Button>
          </Link>
        </motion.div>

        {/* 登录卡片 */}
        <Suspense fallback={<div>加载中...</div>}>
          <LoginForm />
        </Suspense>

        {/* 页脚 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Text align="center" type="secondary" style={{ fontSize: 13 }}>
            Originium Kernel © {new Date().getFullYear()}
          </Text>
        </motion.div>
      </Flexbox>
    </motion.div>
  );
}
