'use client';

import { Card } from 'antd';
import { Flexbox, Text } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { memo } from 'react';

export interface AuthCardProps {
  children?: ReactNode;
  footer?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
}

export const AuthCard = memo<AuthCardProps>(({ children, title, subtitle, footer }) => {
  return (
    <Card
      bordered={false}
      style={{
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 0 15px 0 rgba(0,0,0,0.04), 0 2px 30px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(227,227,227,0.4) inset',
        padding: 32,
      }}
    >
      <Flexbox width={'min(100%, 440px)'}>
        <Flexbox gap={12}>
          {title && (
            <Text fontSize={28} style={{ lineHeight: 1.2 }} weight={'bold'}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text fontSize={16} style={{ lineHeight: 1.4 }} type={'secondary'} weight={400}>
              {subtitle}
            </Text>
          )}
        </Flexbox>
        <Flexbox gap={8} paddingBlock={28}>
          {children}
        </Flexbox>
        {footer && (
          <Flexbox gap={8} paddingBlock={16}>
            {footer}
          </Flexbox>
        )}
      </Flexbox>
    </Card>
  );
});

AuthCard.displayName = 'AuthCard';

export default AuthCard;
