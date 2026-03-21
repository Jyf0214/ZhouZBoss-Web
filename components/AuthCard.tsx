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
 * A clean authentication card component inspired by LobeChat's design language.
 * Simplified layout without Card wrapper for better performance and cleaner UI.
 * 
 * @see https://github.com/lobehub/lobe-chat - UI design reference
 * @copyright LobeChat UI Design
 */
export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer }) => {
  return (
    <Flexbox width={'min(100%, 440px)'}>
      <Flexbox gap={16}>
        {title && (
          <Text fontSize={28} style={{ lineHeight: 1.4 }} weight={'bold'}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text fontSize={18} style={{ lineHeight: 1.4 }} type={'secondary'} weight={500}>
            {subtitle}
          </Text>
        )}
      </Flexbox>
      <Flexbox gap={4} paddingBlock={32}>
        {children}
      </Flexbox>
      {footer}
    </Flexbox>
  );
});

AuthCard.displayName = 'AuthCard';

export default AuthCard;
