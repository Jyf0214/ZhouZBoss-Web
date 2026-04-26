'use client';

import { type FC, type PropsWithChildren } from 'react';
import { Center, Flexbox, Text } from '@lobehub/ui';
import { cx } from 'antd-style';
import { authStyles } from './style';
import { useIsDark } from '@/hooks/useIsDark';

/**
 * 认证页面全屏布局 — 顶部品牌、中部内容、底部版权
 */
const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const isDarkMode = useIsDark();

  return (
    <Flexbox className={authStyles.outer} height={'100%'} padding={8} width={'100%'}>
      <Flexbox
        className={cx(isDarkMode ? authStyles.innerDark : authStyles.innerLight)}
        height={'100%'}
        width={'100%'}
      >
        {/* 品牌标题 */}
        <Flexbox horizontal align={'center'} gap={8} justify={'space-between'} padding={16} width={'100%'}>
          <Text fontSize={20} weight={'bold'}>
            Originium Kernel
          </Text>
        </Flexbox>

        {/* 居中内容 */}
        <Center height={'100%'} padding={16} width={'100%'}>
          {children}
        </Center>

        {/* 底部版权 */}
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
