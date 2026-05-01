import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy (原 middleware.ts)
 * Clerk 可选：仅在配置了环境变量时启用 Clerk 中间件
 */

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default async function proxy(req: NextRequest) {
  const clerkAvailable =
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

  if (!clerkAvailable) {
    return NextResponse.next();
  }

  try {
    const { clerkMiddleware } = await import('@clerk/nextjs/server');
    const handler = clerkMiddleware(async (auth, request) => {
      const publicPaths = ['/', '/posts', '/faces', '/login', '/register', '/api/'];
      const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));
      if (isPublic) return;

      await auth();
    });
    // clerkMiddleware 返回标准 middleware 签名 (req, event)
    return (handler as any)(req, undefined);
  } catch {
    return NextResponse.next();
  }
}
