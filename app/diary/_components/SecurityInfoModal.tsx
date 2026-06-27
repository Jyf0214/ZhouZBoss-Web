'use client';

import { ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function SecurityInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          autoLoading={false}
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900"
          icon={<X size={20} />}
        />
        <h2 className="text-lg font-bold text-zinc-900 mb-4">安全与隐私</h2>
        <ul className="space-y-3 text-sm text-zinc-600">
          <li className="flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <span>本页面仅管理员可查看，其他用户无法访问。</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-blue-500" />
            <span>日记内容加密后全部存储于数据库中，服务端无法直接读取明文。</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-green-500" />
            <span>本地 localStorage 同步缓存草稿，仅当前设备可访问。</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
