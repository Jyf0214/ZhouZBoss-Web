// FooterBrand - 品牌运行时信息（心跳 + 在线/休息状态 + 运行天数）
// 品牌活跃度的可视化表达。

'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

import { Tag } from '@/components/ui/Tag';

export interface FooterRuntimeStatusProps {
  launchTime: string;
  enable: boolean;
}

/**
 * 运行时状态：每秒刷新运行时间，并根据本地小时数（9-18）显示在线/休息中标签。
 */
export function FooterRuntimeStatus({ launchTime, enable }: FooterRuntimeStatusProps) {
  const [text, setText] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!enable || !launchTime) return;
    const launch = new Date(launchTime);
    if (isNaN(launch.getTime())) return;

    const update = () => {
      const now = new Date();
      const diff = now.getTime() - launch.getTime();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setText(`本站已运行 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`);

      const hour = now.getHours();
      setIsOnline(hour >= 9 && hour < 18);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [enable, launchTime]);

  if (!text) return null;

  return (
    <div className="flex items-center justify-center text-sm text-zinc-400 gap-2">
      <Heart className="w-4 h-4 text-red-400 animate-pulse" />
      <span>{text}</span>
      <Tag
        variant="light"
        size="sm"
        className={isOnline ? 'bg-green-100 text-green-700 border-green-200' : ''}
      >
        {isOnline ? '在线' : '休息中'}
      </Tag>
    </div>
  );
}

export default FooterRuntimeStatus;
