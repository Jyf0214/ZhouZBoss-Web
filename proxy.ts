import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Edge Runtime 兼容的数据库检测
 *
 * 与 lib/config.ts:hasDatabase() 逻辑完全一致，但不导入任何 Node.js 模块，
 * 仅使用 process.env，可在 Proxy / Edge Runtime 中安全运行。
 */
function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

/** 无数据库时需要拦截的路径前缀 */
const DB_REQUIRED_PREFIXES = [
  '/dashboard',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/admin',
  '/api/page/sdk/comments',
];

function isDbRequiredPath(pathname: string): boolean {
  return DB_REQUIRED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/**
 * API 路由统一认证防护（原 middleware.ts，Next.js 16 更名为 proxy.ts）
 *
 * 作为第一道防线，在请求到达具体 API 路由处理器之前进行认证检查。
 * 即使某个新路由忘记调用 requireAuth()，proxy 也能拦截未认证请求。
 *
 * 防护策略：
 * - /api/admin/**   → 必须登录 + 管理员角色
 * - /api/config     → 必须登录 + 管理员角色
 * - /api/storage/** → 必须登录（具体权限由路由内检查）
 * - /api/auth/**    → 公开（登录、注册、密码重置等）
 * - /api/health     → 公开
 * - /api/posts/**   → 公开（点赞、查询）
 * - /api/faces      → 公开
 * - 其他 /api/**    → 必须登录
 *
 * 注意：此 proxy 仅做粗粒度拦截，细粒度权限（如 root、API 密钥权限）
 * 仍由各路由内的 requireRoot() / requireApiKeyPermission() 负责。
 */

/** 获取 JWT 验证密钥 */
function getSecretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // 开发环境缺失时使用空密钥，proxy 仅做粗粒度拦截
    // 细粒度验证由 auth.ts 的 getSecret() 处理
    return null;
  }
  return new TextEncoder().encode(secret);
}

/** 需要管理员权限的 API 前缀 */
const ADMIN_PREFIXES = ['/api/admin/', '/api/config'];

/** 公开的 API 路径（不需要认证） */
const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/reset-password',
  '/api/auth/apikey-login',
  '/api/posts/like',
  '/api/faces',
  '/api/feedback',
  '/api/cleanup', // cron 触发（x-cron-secret 由路由内校验），无浏览器 session
  '/api/translations', // 公开文章翻译查询（路由设计为公开，读取公开文章索引）
]);

/** 公开路径前缀 */
const PUBLIC_PREFIXES = [
  '/api/auth/2fa/',   // 2FA 流程需要公开访问（但有临时令牌验证）
  '/api/articles',    // 文章公开查询
  '/api/diary',       // 日记公开查询（具体权限由路由控制）
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

/** 是否为 API 密钥认证请求（Authorization: Bearer sk-xxx） */
function isApiKeyRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return !!authHeader?.startsWith('Bearer sk-');
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : p + '/'));
}

/**
 * 从 cookie 中提取并验证 JWT session
 * 返回 payload 或 null（无效/过期）
 */
async function verifySessionCookie(
  cookieValue: string,
  secretKey: Uint8Array,
): Promise<{ role?: string } | null> {
  try {
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as { role?: string };
  } catch {
    return null;
  }
}

/**
 * Next.js 16 Proxy (原 middleware.ts)
 *
 * 功能：
 * 1. 数据库未配置时，拦截所有需要数据库的路由（返回 503 / 重定向首页）
 * 2. API 路由粗粒度认证检查（登录 + 管理员角色），未认证返回 401/403
 * 3. 认证检查由各页面/API 自行处理
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 数据库未配置时，拦截后台高级功能路由
  if (!hasDatabase() && isDbRequiredPath(pathname)) {
    // API 路由返回 JSON 503
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '数据库未配置，此功能不可用', code: 'FEATURE_DISABLED' },
        { status: 503 },
      );
    }
    // 页面路由重定向到首页（避免暴露后台入口）
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // 仅拦截 API 路由
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // API 密钥认证请求直接放行到路由层
  // 密钥有效性、角色与细粒度权限由路由内的 getSession() / requireApiKeyPermission() 完整校验
  if (isApiKeyRequest(request)) {
    return NextResponse.next();
  }

  // 获取 session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  // 无 session → 拦截
  if (!sessionCookie) {
    return NextResponse.json(
      { error: '需要登录' },
      { status: 401 },
    );
  }

  // 验证 JWT 签名
  const secretKey = getSecretKey();
  if (!secretKey) {
    // AUTH_SECRET 未配置，跳过 proxy 签名验证
    // 由各路由内的 auth 模块处理（开发环境兼容）
    return NextResponse.next();
  }

  const payload = await verifySessionCookie(sessionCookie, secretKey);
  if (!payload) {
    return NextResponse.json(
      { error: '会话无效或已过期' },
      { status: 401 },
    );
  }

  // 管理员路径：检查角色（'sudo' 为存量数据兼容，与 'root' 等价）
  if (isAdminPath(pathname)) {
    const role = payload.role;
    if (role !== 'admin' && role !== 'root' && role !== 'sudo') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}