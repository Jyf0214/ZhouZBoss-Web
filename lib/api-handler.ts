import { type NextRequest, NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/api-logger';
import { getSession } from '@/lib/auth';

interface ApiHandlerContext { params: Promise<Record<string, string>> }
type ApiHandler = (
  req: NextRequest,
  context?: ApiHandlerContext,
) => NextResponse | Promise<NextResponse>;

interface ApiHandlerOptions {
  label: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

/**
 * 解析 context.params 中的指定参数，并确保返回非空字符串
 */
export async function getParam(context: ApiHandlerContext | undefined, name: string): Promise<string> {
  const params = await (context?.params ?? Promise.resolve({} as Record<string, string>));
  return params[name] ?? '';
}

/**
 * 包装 API 路由处理器，提供统一的 try/catch + 日志 + 错误响应
 * 以及可选的权限验证
 */
export function apiHandler(
  method: string,
  options: ApiHandlerOptions,
  handler: ApiHandler,
) {
  const logger = createApiLogger(options.label);
  return async (req: NextRequest, context?: ApiHandlerContext) => {
    try {
      // 权限验证
      if (options.requireAuth || options.requireAdmin) {
        const session = await getSession();
        if (!session) {
          return NextResponse.json({ error: '未登录' }, { status: 401 });
        }
        if (options.requireAdmin && session.role !== 'admin' && session.role !== 'sudo') {
          return NextResponse.json({ error: '无权限访问' }, { status: 403 });
        }
      }
      return await handler(req, context);
    } catch (error) {
      const msg = `${options.label} 失败`;
      logger.error(method, msg, {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: msg }, { status: 500 });
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
