import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { ConfigProvider } from '@/components/ConfigProvider';
import { BackgroundProvider } from '@/components/BackgroundProvider';
import { CustomHead } from '@/components/CustomHead';
import { loadConfigAsync } from '@/lib/config';
import { validateEnv } from '@/lib/env';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';

// 生产环境验证环境变量
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
  } catch (error: any) {
    console.error('Environment validation failed:', error.message);
  }
}

export const metadata: Metadata = {
  title: 'Originium Kernel - 内容发布平台',
  description: '基于 Node/Edge Function 的现代内容发布平台，支持 GitHub 自动同步',
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 优先从数据库加载站点配置，回退到 config.json
  const config = await loadConfigAsync();

  let locale;
  let messages;
  try {
    locale = await getLocale();
    messages = await getMessages();
  } catch {
    locale = defaultLocale;
    messages = (await import('@/i18n/zh-CN.json')).default;
  }

  const siteTitle = config.site.title || 'Originium Kernel';
  const siteDescription = config.site.description || '现代内容发布平台';

  return (
    <html lang={locale || config.site.lang || 'zh-CN'}>
      <head>
        <CustomHead />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConfigProvider>
            <BackgroundProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </BackgroundProvider>
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
