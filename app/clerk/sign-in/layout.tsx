import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录 - Originium Kernel',
};

export const dynamic = 'force-dynamic';

export default function ClerkSignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
