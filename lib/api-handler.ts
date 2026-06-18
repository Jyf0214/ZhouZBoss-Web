import { type NextRequest, NextResponse } from 'next/server';
import { getSession, requireSudo } from '@/lib/auth';

export interface ApiHandlerOptions {
  label: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireSudo?: boolean;
}

interface ApiCtx<P extends Record<string, unknown>> { params: Promise<P> }

/**
 * 解析 context.params 中的指定参数，并确保返回非空字符串
 */
export async function getParam<P extends Record<string, unknown> = Record<string, string>>(
  context: ApiCtx<P> | undefined,
  name: keyof P & string,
): Promise<string> {
  const params = (await (context?.params ?? Promise.resolve({} as P)));
  return (params[name] as unknown as string | undefined) ?? '';
}

/**
 * 从请求 URL 提取查询参数摘要(仅记录 key,不记录敏感值)
 */
function querySummary(req: NextRequest): string {
  const keys = Array.from(req.nextUrl.searchParams.keys());
  if (keys.length === 0) return '';
  return ` ${JSON.stringify(Object.fromEntries(keys.map(k => [k, req.nextUrl.searchParams.get(k)])))}`;
}

/**
 * 包装 API 路由处理器，提供统一的 try/catch + 日志 + 错误响应
 * 以及可选的权限验证
 *
 * 日志策略:
 * - 仅在异常/错误时输出日志(4xx/5xx)
 * - 成功响应不输出日志(由各路由自行按需记录业务日志)
 * - 错误日志包含完整上下文:端点、查询参数、错误信息
 */
export function apiHandler<
  P extends Record<string, unknown> = Record<string, string>,
>(
  method: string,
  options: ApiHandlerOptions,
  handler: (req: NextRequest, ctx?: ApiCtx<P>) => NextResponse | Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx?: ApiCtx<P>) => {
    const pathname = req.nextUrl.pathname;

    // 校验 HTTP 方法
    if (req.method !== method) {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
      // 权限验证
      if (options.requireAuth || options.requireAdmin) {
        const session = await getSession();
        if (!session) {
          console.warn(`[API] ${method} ${pathname}${querySummary(req)} → 401 未登录`);
          return NextResponse.json({ error: '未登录' }, { status: 401 });
        }
        if (options.requireAdmin && session.role !== 'admin' && session.role !== 'sudo') {
          console.warn(`[API] ${method} ${pathname}${querySummary(req)} → 403 用户 ${session.uid} 无管理员权限`);
          return NextResponse.json({ error: '无权限访问' }, { status: 403 });
        }
      }
      if (options.requireSudo) {
        const result = await requireSudo();
        if (result instanceof NextResponse) {
          console.warn(`[API] ${method} ${pathname}${querySummary(req)} → ${result.status} sudo 验证失败`);
          return result;
        }
      }
      return await handler(req, ctx);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[API] ${method} ${pathname}${querySummary(req)} → 500 ${options.label} 失败`, {
        message: err.message,
        stack: err.stack,
      });
      return NextResponse.json({ error: `${options.label} 失败` }, { status: 500 });
    }
  };
}

/** 快速错误响应工厂 */
export const ApiErr = {
  unauthorized: (msg = '未登录') => NextResponse.json({ error: msg }, { status: 401 }),
  forbidden: (msg = '无权限访问') => NextResponse.json({ error: msg }, { status: 403 }),
  notFound: (msg = '资源不存在') => NextResponse.json({ error: msg }, { status: 404 }),
  badRequest: (msg = '请求参数错误') => NextResponse.json({ error: msg }, { status: 400 }),
  serverError: (msg = '服务器内部错误') => NextResponse.json({ error: msg }, { status: 500 }),
};
