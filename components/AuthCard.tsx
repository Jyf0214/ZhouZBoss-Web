'use client';

import { Flexbox, Text } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { memo } from 'react';

export interface AuthCardProps {
  children?: ReactNode;
  footer?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
}

/**
 * AuthCard Component
 * 
 * 认证卡片组件，采用 LobeChat 设计语言
 * 特点：
 * - 大标题视觉权重（32px，bold，-0.5px letter-spacing）
 * - 充足的元素间距和呼吸感
 * - 简约现代的视觉风格
 *
 * @see https://github.com/lobehub/lobe-chat - UI 设计参考
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */
export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer }) => {
  return (
    <Flexbox width={'min(100%, 440px)'}>
      <Flexbox gap={16}>
        {title && (
          <Text
            fontSize={32}
            style={{
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              fontWeight: 700,
            }}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            fontSize={16}
            style={{ lineHeight: 1.4 }}
            type={'secondary'}
            weight={400}
          >
            {subtitle}
          </Text>
        )}
      </Flexbox>
      <Flexbox gap={12} paddingBlock={32}>
        {children}
      </Flexbox>
      {footer}
    </Flexbox>
  );
});

AuthCard.displayName = 'AuthCard';

export default AuthCard;
