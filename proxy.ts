import { type NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy (原 middleware.ts)
 * Clerk 可选：仅在配置了环境变量时启用 Clerk 中间件
 * 认证检查由各页面/API 自行处理，proxy 不拦截任何路由
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
    // 所有路由都放行，认证由页面和 API 自行处理
    const handler = clerkMiddleware(() => NextResponse.next());
    return handler(req);
	} catch (error) {
		console.error('Clerk 中间件加载失败，跳过 Clerk 处理:', error);
		return NextResponse.next();
	}
}
