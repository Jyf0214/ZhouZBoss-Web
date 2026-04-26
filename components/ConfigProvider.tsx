'use client';

import React from 'react';
import { ConfigProvider as AntdConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

interface ConfigProviderProps {
  children: React.ReactNode;
}

/**
 * AntD Config Provider
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  return (
    <AntdConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1677ff',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Card: {
            borderRadius: 12,
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Table: {
            borderRadius: 8,
          },
        },
      }}
    >
      {children}
    </AntdConfigProvider>
  );
}
