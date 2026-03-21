/**
 * AuthCard Component
 * 
 * 认证卡片组件 - 复制自 LobeChat
 * 
 * @see https://github.com/lobehub/lobe-chat - branch: canary, commit: 81bd6dc
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */
'use client';

import { type FlexboxProps } from '@lobehub/ui';
import { Flexbox, Text } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { memo } from 'react';

export interface AuthCardProps extends Omit<FlexboxProps, 'title'> {
  footer?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
}

export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer, ...rest }) => {
  return (
    <Flexbox width={'min(100%,480px)'} {...rest}>
      <Flexbox gap={24}>
        {title && (
          <Text fontSize={32} style={{ lineHeight: 1.6, marginBottom: 0 }} weight={'bold'}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text fontSize={18} style={{ lineHeight: 1.6 }} type={'secondary'} weight={400}>
            {subtitle}
          </Text>
        )}
      </Flexbox>
      <Flexbox gap={16} paddingBlock={48}>
        {children}
      </Flexbox>
      {footer}
    </Flexbox>
  );
});

AuthCard.displayName = 'AuthCard';

export default AuthCard;
