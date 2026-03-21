import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Originium Kernel Middleware
 * Handles Dynamic Route Rewriting: https://example.com/{user}/{article}
 * Also handles Security Headers
 */

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip internal routes and assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/editor') ||
    pathname.includes('.') // for favicon, static images, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  // 3. Dynamic Route Rewriting: /{user}/{article}
  // Logic: if it matches /user/article, rewrite to /article/view?user=user&article=article
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 2) {
    const [user, article] = segments;
    // Rewrite internally to a standard Next.js route
    return NextResponse.rewrite(new URL(`/article/view?user=${user}&article=${article}`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
