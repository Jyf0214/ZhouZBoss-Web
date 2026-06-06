import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/* ============================================================
   「更多」按钮 — 触发 ShareModal
   ============================================================ */

export interface ShareMoreButtonProps {
  onClick: () => void;
  /** 控制内部图标大小；sm → 16，md → 20 */
  size?: 'sm' | 'md';
}

export default function ShareMoreButton({ onClick, size = 'md' }: ShareMoreButtonProps) {
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      onClick={onClick}
      title="更多分享方式"
    >
      <MoreHorizontal size={iconSize} />
    </Button>
  );
}
