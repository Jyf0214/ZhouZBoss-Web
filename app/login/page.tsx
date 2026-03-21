'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, Form, message } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Flexbox, Text } from '@lobehub/ui';
import Link from 'next/link';
import { motion } from 'motion/react';
import AuthCard from '@/components/AuthCard';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [form] = Form.useForm();

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <AuthCard
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
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
            style={{ marginBottom: 20 }}
          >
            <Input
              placeholder="请输入用户名"
              size="large"
              className="rounded-xl"
              prefix={<UserOutlined className="text-zinc-400" />}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
            style={{ marginBottom: 8 }}
          >
            <Input.Password
              placeholder="请输入密码"
              size="large"
              className="rounded-xl"
              prefix={<LockOutlined className="text-zinc-400" />}
            />
          </Form.Item>

          <Flexbox horizontal justify="flex-end" paddingBlock={8}>
            <Link href="/forgot-password">
              <Text type="secondary" style={{ fontSize: 13 }}>忘记密码？</Text>
            </Link>
          </Flexbox>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button 
              block 
              htmlType="submit" 
              loading={loading} 
              size="large" 
              type="primary"
              className="rounded-xl font-medium h-12"
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
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <Text type="secondary" style={{ fontSize: 14 }}>还没有账号？</Text>
          <Link href="/register">
            <Text style={{ fontSize: 14, fontWeight: 500, color: '#1677ff' }}>立即注册</Text>
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
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)' }}
    >
      <Flexbox gap={32} style={{ width: '100%', maxWidth: 440 }}>
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
              className="text-zinc-600 hover:text-zinc-900"
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
          className="text-center"
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Originium Kernel © {new Date().getFullYear()}
          </Text>
        </motion.div>
      </Flexbox>
    </motion.div>
  );
}
