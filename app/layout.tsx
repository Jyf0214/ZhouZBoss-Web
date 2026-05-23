import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/use-auth';
import { CustomHead } from '../components/CustomHead';
import { Providers } from './providers';
import { loadConfigAsync } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Originium Kernel',
  description: '现代内容发布平台',
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const config = await loadConfigAsync();
  return (
    <html lang={config.site.lang}>
      <body suppressHydrationWarning>
        <CustomHead />
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
