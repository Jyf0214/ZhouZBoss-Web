'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const CATEGORY_OPTIONS = [
  { value: 'bug', label: 'Bug 报告' },
  { value: 'feature', label: '功能建议' },
  { value: 'feedback', label: '一般反馈' },
] as const;

export function FeedbackForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('feedback');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      setErrorMessage('请填写标题和内容');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), category }),
      });

      const data = await res.json() as { error?: string; success?: boolean };

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.error ?? '提交失败，请稍后重试');
        return;
      }

      setStatus('success');
      setTitle('');
      setBody('');
      setCategory('feedback');
    } catch {
      setStatus('error');
      setErrorMessage('网络错误，请检查网络连接后重试');
    }
  }, [title, body, category]);

  const resetForm = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  // 提交成功
  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">感谢你的反馈</h3>
        <p className="text-sm text-zinc-500 mb-4">
          你的反馈已成功提交，我们会认真查看每一条建议。
        </p>
        <Button variant="default" size="sm" onClick={resetForm}>
          继续提交
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-zinc-900 mb-1">提交反馈</h3>
      <p className="text-sm text-zinc-500 mb-5">
        遇到问题、有功能建议或想分享想法？请在这里告诉我们。
      </p>

      <div className="space-y-4">
        <Select
          label="类别"
          size="md"
          rounded="sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>

        <Input
          label="标题"
          size="md"
          rounded="sm"
          placeholder="简要描述你的反馈"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />

        <Textarea
          label="内容"
          minH="min-h-[140px]"
          rounded="md"
          placeholder="详细描述你遇到的问题、建议或想法..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
        />

        {status === 'error' && errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Send size={14} />}
            loading={status === 'submitting'}
          >
            提交反馈
          </Button>
        </div>
      </div>
    </form>
  );
}

export default FeedbackForm;
