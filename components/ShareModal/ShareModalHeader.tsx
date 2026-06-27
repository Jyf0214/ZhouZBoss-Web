'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShareModalHeaderProps {
  onClose: () => void;
}

export function ShareModalHeader({ onClose }: ShareModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
      <h2 className="text-lg font-bold text-zinc-900">分享</h2>
      <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="关闭" autoLoading={false}>
        <X size={18} />
      </Button>
    </div>
  );
}
