import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/posts(.*)',
  '/faces(.*)',
  '/login(.*)',
  '/register(.*)',
  '/api/auth/(.*)',
  '/api/posts(.*)',
  '/api/faces(.*)',
  '/api/env-status(.*)',
  '/api/config(.*)',
  '/api/webhooks/clerk(.*)',
]);

const isClerkRoute = createRouteMatcher(['/clerk/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Clerk 路由不需要额外处理
  if (isClerkRoute(req)) return;

  // 公开路由直接放行
  if (isPublicRoute(req)) return;

  // 其余路由需要 Clerk 认证或自定义 JWT 认证
  const { userId } = await auth();
  if (!userId) {
    // Clerk 未登录，由页面自行处理（可能使用自定义 JWT）
    return;
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};