'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { Navbar } from '@/components/Navbar';
import { Button, Input, Form, message, Steps } from 'antd';
import { Mail, Shield, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Clerk 账户绑定页面
 * 流程：输入邮箱 → 发送验证码 → 输入验证码 → 绑定
 */
export default function ClerkBindPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  /** 发送验证码 */
  const handleSendCode = async () => {
    if (!email.includes('@')) {
      message.error('请输入有效的邮箱地址');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/bind-send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodeSent(true);
        setStep(1);
        message.success('验证码已发送');
        // 60 秒倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(data.error || '发送失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  /** 验证并绑定 */
  const handleVerifyAndBind = async () => {
    if (!code || code.length < 4) {
      message.error('请输入验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/bind-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        message.success('账户绑定成功！');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        message.error(data.error || '验证失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-zinc-400">请先通过 Clerk 登录</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-10 max-w-md w-full">
          {/* 步骤条 */}
          <Steps
            current={step}
            size="small"
            className="mb-8"
            items={[
              { title: '输入邮箱' },
              { title: '验证身份' },
              { title: '完成' },
            ]}
          />

          {step === 0 && (
            <>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail size={24} className="text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2 text-center">
                绑定已有账户
              </h1>
              <p className="text-zinc-400 text-sm mb-8 text-center">
                输入你 Originium Kernel 账户的邮箱，我们将发送验证码确认身份
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  账户邮箱
                </label>
                <Input
                  size="large"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  prefix={<Mail size={16} className="text-zinc-400" />}
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handleSendCode}
                className="h-12 rounded-xl bg-zinc-900"
                icon={<ArrowRight size={16} />}
              >
                发送验证码
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield size={24} className="text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2 text-center">
                验证身份
              </h1>
              <p className="text-zinc-400 text-sm mb-8 text-center">
                验证码已发送至 <strong className="text-zinc-700">{email}</strong>
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  验证码
                </label>
                <Input
                  size="large"
                  placeholder="输入 6 位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  prefix={<KeyRound size={16} className="text-zinc-400" />}
                  className="h-12 rounded-xl text-center text-lg tracking-[0.5em]"
                />
              </div>
              <div className="space-y-3">
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={loading}
                  onClick={handleVerifyAndBind}
                  className="h-12 rounded-xl bg-zinc-900"
                >
                  验证并绑定
                </Button>
                <Button
                  size="large"
                  block
                  disabled={countdown > 0}
                  onClick={handleSendCode}
                  className="h-12 rounded-xl"
                >
                  {countdown > 0 ? `${countdown}s 后重新发送` : '重新发送验证码'}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2">
                绑定完成
              </h1>
              <p className="text-zinc-400 text-sm">
                正在跳转到控制台...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}