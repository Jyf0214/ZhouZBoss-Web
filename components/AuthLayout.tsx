'use client';

import { Center, Flexbox, Text } from '@lobehub/ui';
import { type FC, type PropsWithChildren } from 'react';

/**
 * AuthLayout Component
 * 
 * Full auth page layout inspired by LobeChat's design.
 * Includes container with border, logo header, and footer.
 * 
 * @see https://github.com/lobehub/lobe-chat - UI design reference
 * @copyright LobeChat UI Design
 */
const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Flexbox height={'100%'} padding={8} width={'100%'} style={{ minHeight: '100vh' }}>
      <Flexbox
        height={'100%'}
        width={'100%'}
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--ant-color-border)',
          borderRadius: 'var(--ant-border-radius)',
          background: 'var(--ant-color-bg-container)',
        }}
      >
        <Flexbox
          horizontal
          align={'center'}
          gap={8}
          justify={'space-between'}
          padding={16}
          width={'100%'}
        >
          <Text fontSize={20} weight={'bold'}>
            Originium Kernel
          </Text>
        </Flexbox>
        <Center height={'100%'} padding={16} width={'100%'}>
          {children}
        </Center>
        <Center padding={24}>
          <Text align={'center'} type={'secondary'}>
            Originium Kernel © {new Date().getFullYear()}
          </Text>
        </Center>
      </Flexbox>
    </Flexbox>
  );
};

export default AuthLayout;
