import { type NextRequest, NextResponse } from 'next/server';
import { getSession, isRootRole, getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { updateFileInGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';
import yaml from 'js-yaml';
import { zAppConfig } from '@/lib/config-schema';

const logger = createApiLogger('/api/github/sync');

/**
 * 推送前校验 config.yaml 内容：YAML 可解析且通过 zod 校验（与 /api/config 同轨道）。
 * ① 拒绝畸形 YAML（否则下次构建 loadConfig 解析失败 → 站点级不可用）
 * ② 拒绝含非法值的配置（前端内联消费轨道不经过运行时校验，schema 的防注入 refine 会失效）
 */
function validateSyncContent(content: string): { ok: true } | { ok: false; error: string; auditDetail: string } {
  let parsedConfig: unknown;
  try {
    parsedConfig = yaml.load(content);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `${getTranslate('api.config.validationFailed')}: ${detail}`,
      auditDetail: getTranslate('api.github.auditYamlParseFailed', { detail }),
    };
  }
  const validated = zAppConfig.partial().safeParse(parsedConfig);
  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    const issueText = firstIssue
      ? `${firstIssue.path.join('.') || '(root)'}: ${firstIssue.message}`
      : '';
    return {
      ok: false,
      error: `${getTranslate('api.config.validationFailed')}${issueText ? `: ${issueText}` : ''}`,
      auditDetail: getTranslate('api.github.auditSchemaFailed', { detail: issueText }),
    };
  }
  return { ok: true };
}

/**
 * 统一 GitHub 同步 API
 *
 * 仅支持 config-yaml 类型，config.json 已被淘汰。
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const auditUser = session?.uid ?? 'unknown';
  // config.yaml 写入属 root-only（与 /api/config POST 的 requireRoot 同口径）：
  // 否则 admin 或低权 API key 可绕过配置管控、zod 校验与 sudo 提权审批链，
  // 经此通道整体覆写含注入面字段（customHead/customCSS/access 规则）的站点配置
  if (!session || !isRootRole(session.role)) {
    logger.warn('POST', '无权限');
    void logAudit('github_sync_failed', 'github', 'GitHub 同步失败：无权限', auditUser);
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }

  // API 密钥认证的请求需 settings_write 权限（与 /api/config 的写权限同口径）
  const authResult = await getSessionWithKeyId();
  if (authResult) {
    const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'settings_write');
    if (permErr) return permErr;
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubRepo || !githubToken) {
    logger.warn('POST', 'GitHub 未配置');
    void logAudit('github_sync_failed', 'github', 'GitHub 同步失败：GitHub 未配置', auditUser);
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { type = 'config-yaml' } = body;

    logger.info('POST', '开始同步', { type });

    if (type !== 'config-yaml') {
      logger.warn('POST', '不支持的同步类型', { type });
      void logAudit('github_sync_failed', 'github', `GitHub 同步失败：不支持的同步类型（${String(type)}）`, auditUser);
      return NextResponse.json({ error: getTranslate('api.github.unsupportedSyncType') }, { status: 400 });
    }

    const { content, message: commitMessage } = body;
    if (!content) {
      logger.warn('POST', 'config-yaml 缺少 content 字段');
      void logAudit('github_sync_failed', 'github', 'GitHub 同步失败：config-yaml 缺少 content 字段', auditUser);
      return NextResponse.json({ error: getTranslate('api.github.missingYamlContent') }, { status: 400 });
    }

    const verdict = validateSyncContent(content);
    if (!verdict.ok) {
      void logAudit('github_sync_failed', 'github', verdict.auditDetail, auditUser);
      return NextResponse.json({ error: verdict.error }, { status: 400 });
    }

    await updateFileInGithub({
      repo: githubRepo,
      token: githubToken,
      path: 'config.yaml',
      content,
      message: commitMessage ?? 'chore: update config from admin panel',
    });
    logger.info('POST', 'config.yaml 同步成功');
    void logAudit('github_sync', 'github', 'GitHub 同步成功：config.yaml', auditUser);

    return NextResponse.json({ success: true, message: getTranslate('api.github.syncSuccess') });
  } catch (error) {
    logger.error('POST', '同步失败', { error: String(error) });
    void logAudit('github_sync_failed', 'github', 'GitHub 同步失败', auditUser);
    return NextResponse.json(
      { error: getTranslate('api.github.syncFailed') },
      { status: 500 }
    );
  }
}
