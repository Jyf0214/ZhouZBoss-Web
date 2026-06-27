// FooterSocial - 一组社交图标按钮（用于头像左侧或右侧）

'use client';

import React from 'react';

import { Button } from '@/components/ui/Button';
import { resolveFooterIcon } from './footer-config';
import type { FooterSocialEntry } from './types';

export interface FooterSocialProps {
  entries: FooterSocialEntry[];
}

/**
 * 渲染一组水平排列的社交图标按钮。
 * 数据为空时不渲染（由父级决定整体布局）。
 */
export function FooterSocial({ entries }: FooterSocialProps) {
  if (entries.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      {entries.map((item) => {
        const Icon = resolveFooterIcon(item.icon);
        return (
          <Button
            key={item.name}
            variant="primary"
            iconOnly
            rounded="full"
            title={item.name}
            aria-label={item.name}
            autoLoading={false}
            onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
          >
            <Icon className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
}

export default FooterSocial;
