'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Form, notification, message, Select } from 'antd';
import { User, Lock, Mail } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';
import AuthCard from '@/components/AuthCard';
import AuthLayout from '@/components/AuthLayout';

interface UserGroup {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

/**
 * 注册页面 — 收集用户信息并创建账号
 */
export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const router = useRouter();
  const [form] = Form.useForm();

  /** 获取可选用户组列表 */
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/user-groups');
        if (res.ok) {
          const data = await res.json();
          // 过滤掉管理组，普通注册不可选择
          setGroups(data.filter((g: UserGroup) => g.id !== 'sudo' && g.id !== 'admin'));
        }
      } catch (error) {
        console.error('获取用户组失败:', error);
      }
    };
    fetchGroups();
  }, []);

  /** 提交注册表单 */
  const onFinish = async (values: any) => {
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
          username: values.username,
          password: values.password,
          name: values.name || values.email.split('@')[0],
          userGroup: values.userGroup || 'default',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const roleMsg =
          data.user?.role === 'sudo'
            ? '您是首个注册用户，已获得管理员权限！'
            : '账号已创建，请前往登录';
        notification.success({ message: '注册成功', description: roleMsg, placement: 'topRight', duration: 5 });
        router.push('/login');
      } else {
        throw new Error(data.error || data.message || '注册失败');
      }
    } catch (err: any) {
      console.error('注册失败:', err);
      message.error(err.message || '注册失败');
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

  return (
    <AuthLayout>
      <AuthCard
        footer={
          <Flexbox horizontal justify="center" gap={8} paddingBlock={24}>
            <Text type="secondary" style={{ fontSize: 14, lineHeight: '22px' }}>
              已有账号？
            </Text>
            <Link href="/login">
              <Text style={{ fontSize: 14, fontWeight: 500, lineHeight: '22px' }}>
                立即登录
              </Text>
            </Link>
          </Flexbox>
        }
        subtitle="加入 Originium Kernel"
        title="创建账号"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            style={{ marginBottom: 16 }}
            rules={[
              { required: true, message: '请输入电子邮箱' },
              { type: 'email', message: '请输入有效的电子邮箱地址' },
            ]}
          >
            <Input
              placeholder="your@email.com"
              size="large"
              prefix={<Icon icon={Mail} style={{ marginInline: 8 }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="username"
            style={{ marginBottom: 16 }}
            rules={[
              { required: true, message: '请输入用户名' },
              { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含字母、数字和下划线，3-20个字符' },
            ]}
          >
            <Input
              placeholder="用户名（用于登录）"
              size="large"
              prefix={<Icon icon={User} style={{ marginInline: 8 }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="name"
            style={{ marginBottom: 16 }}
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, message: '昵称至少 2 个字符' },
            ]}
          >
            <Input
              placeholder="您的昵称"
              size="large"
              prefix={<Icon icon={User} style={{ marginInline: 8 }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="password"
            style={{ marginBottom: 16 }}
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password
              placeholder="至少 6 个字符"
              size="large"
              prefix={<Icon icon={Lock} style={{ marginInline: 8 }} />}
              style={inputStyle}
            />
          </Form.Item>

          {groups.length > 0 && (
            <Form.Item name="userGroup" style={{ marginBottom: 16 }} initialValue="default">
              <Select
                size="large"
                placeholder="选择用户组"
                style={{ height: 56 }}
                options={groups.map(g => ({ label: g.name, value: g.id }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="confirmPassword"
            style={{ marginBottom: 0 }}
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认您的密码' },
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
            <Input.Password
              placeholder="再次输入密码"
              size="large"
              prefix={<Icon icon={Lock} style={{ marginInline: 8 }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button
              block
              htmlType="submit"
              loading={loading}
              size="large"
              type="primary"
              style={{ height: 48, borderRadius: 8, fontSize: 16 }}
            >
              立即注册
            </Button>
          </Form.Item>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
