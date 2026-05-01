'use client';

import { type FC, type PropsWithChildren } from 'react';
import { cx } from 'antd-style';
import { authStyles } from './style';
import { useIsDark } from '@/hooks/useIsDark';

/**
 * 认证页面全屏布局 — 顶部品牌、中部内容、底部版权
 */
const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const isDarkMode = useIsDark();

  return (
    <div className={authStyles.outer} style={{ height: '100%', padding: 8, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={cx(isDarkMode ? authStyles.innerDark : authStyles.innerLight)} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 品牌标题 */}
        <div className="flex items-center gap-2 justify-between w-full px-4 py-4">
          <span className="text-xl font-bold text-zinc-900">Originium Kernel</span>
        </div>

        {/* 居中内容 */}
        <div className="flex-1 flex items-center justify-center w-full p-4">
          {children}
        </div>

        {/* 底部版权 */}
        <div className="flex items-center justify-center py-6">
          <span className="text-sm text-zinc-400 text-center">
            Originium Kernel © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
