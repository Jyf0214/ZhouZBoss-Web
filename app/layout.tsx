import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/hooks/use-auth';
import { ConfigProvider } from '@/components/ConfigProvider';
import { validateEnv } from '@/lib/env';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';

// Validate environment variables on startup
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
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  let locale;
  let messages;
  
  try {
    locale = await getLocale();
    messages = await getMessages();
  } catch {
    locale = defaultLocale;
    messages = (await import('@/i18n/zh-CN.json')).default;
  }

  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConfigProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
