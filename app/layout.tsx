import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';
import { CustomHead } from '../components/CustomHead';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';
import { RouteTransition } from '../components/RouteTransition';
import { loadConfig } from '@/lib/config';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const config = loadConfig();
  return (
    <html lang={config.site.lang} suppressHydrationWarning>
      <body>
        <CustomHead />
        {/* 跳过导航链接：键盘用户可直接跳到正文 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-zinc-900 focus:outline-none"
        >
          跳到正文内容
        </a>
        <Providers>
          <AuthProvider>
            <Navbar navConfig={config.nav} siteTitle={config.site.title} />
            <div id="main-content" tabIndex={-1}>
              <RouteTransition>{children}</RouteTransition>
            </div>
          </AuthProvider>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
