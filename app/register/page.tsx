'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input, message, Card } from 'antd';
import { UserAddOutlined, LockOutlined, MailOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      return message.warning('请填写所有必要信息');
    }

    setLoading(true);
    try {
      await register(email, password, name);
      router.push('/dashboard');
    } catch (error: any) {
      // Error handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="absolute top-10 left-10 flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-all font-bold group">
        <ArrowLeftOutlined className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl -rotate-3 hover:rotate-0 transition-transform duration-500 border border-zinc-100">
            <UserAddOutlined className="text-zinc-900 text-4xl" />
          </div>
          <h1 className="text-4xl font-display font-black text-zinc-900 tracking-tighter">New Node</h1>
          <p className="text-zinc-400 mt-4 font-bold text-sm uppercase tracking-widest">Register to Originium Kernel</p>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-zinc-100 shadow-2xl shadow-zinc-200/50 p-4">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Alias (Display Name)</label>
              <Input
                size="large"
                prefix={<UserOutlined className="text-zinc-300 mr-2" />}
                placeholder="Doctor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 rounded-2xl border-zinc-100 focus:border-zinc-900 hover:border-zinc-300 transition-all text-lg font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Identity (Email)</label>
              <Input
                size="large"
                prefix={<MailOutlined className="text-zinc-300 mr-2" />}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border-zinc-100 focus:border-zinc-900 hover:border-zinc-300 transition-all text-lg font-medium"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1">Access Key (Password)</label>
              <Input.Password
                size="large"
                prefix={<LockOutlined className="text-zinc-300 mr-2" />}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-2xl border-zinc-100 focus:border-zinc-900 hover:border-zinc-300 transition-all text-lg font-medium"
              />
            </div>

            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border-none text-lg font-black tracking-tight mt-4 shadow-xl shadow-zinc-200"
            >
              Generate New UID
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-zinc-50 text-center">
            <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-4">Already synchronized?</p>
            <Link href="/login" className="text-zinc-900 font-black hover:underline text-lg">
              Connect to Node
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
