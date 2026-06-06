import React from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/* ============================================================
   复制链接按钮
   ============================================================ */

export interface ShareCopyButtonProps {
  onClick: () => void;
}

export default function ShareCopyButton({ onClick }: ShareCopyButtonProps) {
  return (
    <Button
      variant="primary"
      size="md"
      iconOnly
      onClick={onClick}
      title="复制链接"
    >
      <Link2 size={18} />
    </Button>
  );
}
