import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clerk 登录处理 - Originium Kernel',
};

// 强制动态渲染，禁止预渲染
export const dynamic = 'force-dynamic';

export default function ClerkAfterAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
