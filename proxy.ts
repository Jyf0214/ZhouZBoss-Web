import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'fallback-secret-at-least-32-chars-long'
);

/** 需要管理员权限的路径 */
const ADMIN_PATHS = ['/admin'];
/** 需要登录的路径 */
const AUTH_PATHS = ['/dashboard'];
/** 已登录用户不应访问的路径（重定向到首页） */
const GUEST_ONLY_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * 从请求中解析 session
 */
async function getSessionFromRequest(req: NextRequest): Promise<{ uid: string; role: string } | null> {
  const session = req.cookies.get('session')?.value;
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, SECRET, { algorithms: ['HS256'] });
    return payload as unknown as { uid: string; role: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);
  const isAuthenticated = !!session;
  const isAdmin = session?.role === 'admin' || session?.role === 'sudo';

  // 已登录用户访问登录/注册页面时重定向到首页
  if (isAuthenticated && GUEST_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 需要登录的页面
  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 需要管理员权限的页面
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && !isAdmin) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL('/403', request.url));
  }

  // API 路由保护：管理员 API
  if (pathname.startsWith('/api/admin') && !isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  // API 路由保护：需要登录的 API
  if (pathname.startsWith('/api/user/profile') && !isAuthenticated) {
    return NextResponse.json({ error: '需要登录' }, { status: 401 });
  }

  // 安全响应头
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico
     * - 公开资源文件
     */
    '/((?!_next/static|_next/image|favicon.ico|posts|faces|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
