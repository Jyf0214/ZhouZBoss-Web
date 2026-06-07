/**
 * 站点 URL 常量
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * 站点根地址（惰性求值，仅实际使用时才检查环境变量）
 *
 * 解析优先级：
 * 1. `NEXT_PUBLIC_SITE_URL` — 显式配置的最高优先级（运维约定的 canonical URL）
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel 在自定义域名生效后自动注入
 *    （无协议，需补 `https://`）。在 Vercel 生产环境与显式变量同值
 * 3. `VERCEL_URL` — Vercel 部署 URL（无协议）。生产/预览都会设置；
 *    预览环境用这个会是临时 URL，仅作为最后兜底
 * 4. 全部缺失 → 抛错（fail loud，便于运维发现）
 *
 * 注：兜底分支会 `console.warn`，避免「静默成功」式隐藏问题。
 */
function resolveSiteUrl(): string {
  if (isDev) return 'http://localhost:3000';

  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    console.warn(
      `[url] NEXT_PUBLIC_SITE_URL 未设置,使用 Vercel VERCEL_PROJECT_PRODUCTION_URL 兜底: https://${vercelProd}` +
        `。建议在 Vercel Project Settings 中显式设置 NEXT_PUBLIC_SITE_URL 以便 canonical 稳定。`,
    );
    return `https://${vercelProd}`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    console.warn(
      `[url] NEXT_PUBLIC_SITE_URL / VERCEL_PROJECT_PRODUCTION_URL 均未设置,使用 VERCEL_URL 兜底(可能是预览部署): https://${vercelUrl}` +
        `。建议在 Vercel Project Settings 中显式设置 NEXT_PUBLIC_SITE_URL。`,
    );
    return `https://${vercelUrl}`;
  }

  throw new Error(
    '生产环境必须设置 NEXT_PUBLIC_SITE_URL(优先)或 VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL 之一',
  );
}

let _siteUrl: string | undefined;

export function getSiteUrl(): string {
  _siteUrl ??= resolveSiteUrl();
  return _siteUrl;
}

/** 站点域名 */
export const SITE_DOMAIN = (() => {
  try { return new URL(getSiteUrl()).hostname; } catch { return 'localhost'; }
})();

/** 隐私政策页 */
export const PRIVACY_URL = '/privacy';

/** 服务条款页 */
export const TERMS_URL = '/terms';

/** 生成站点图片路径 */
export const imageUrl = (filename: string) => `/images/${filename}`;
