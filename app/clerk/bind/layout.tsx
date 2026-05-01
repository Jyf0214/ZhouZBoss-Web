import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '绑定账户 - Originium Kernel',
};

// 强制动态渲染，禁止预渲染
export const dynamic = 'force-dynamic';

export default function ClerkBindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
