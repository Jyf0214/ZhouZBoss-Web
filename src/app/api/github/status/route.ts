import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/github/status');

/**
 * ⚠️ 静态导出构建警告：本目录属于 DB 依赖路由（src/app/api/github），
 * 构建时由 scripts/filter-db-routes.mjs 整体移除，禁止添加 export const dynamic。
 *
 * GET /api/github/status
 * 轻量探测 GitHub 同步是否已配置（GITHUB_REPO 与 GITHUB_TOKEN 是否同时设置）。
 *
 * 权限为 requireAuth（而非 env-status 的 requireRoot）：编辑器准入是任意登录用户，
 * 发布接口本身也只需登录——探测接口权限必须 ≤ 发布接口权限，
 * 否则 admin 会因 403 被误判"GitHub 未配置"而永远无法发布。
 * 仅返回布尔值，不泄露任何变量名以外的信息。
 */
export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) {
      return session;
    }
    const configured = Boolean(process.env.GITHUB_REPO && process.env.GITHUB_TOKEN);
    return NextResponse.json({ configured });
  } catch (error) {
    logger.error('GET', '查询 GitHub 状态失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: getTranslate('api.common.serverError') },
      { status: 500 },
    );
  }
}
