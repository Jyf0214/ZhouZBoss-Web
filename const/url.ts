/**
 * 站点 URL 常量
 */

const isDev = process.env.NODE_ENV === 'development';
const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';

/**
 * 站点根地址（惰性求值，仅实际使用时才检查环境变量）
 *
 * 解析优先级：
 * 1. `APP_URL` — 文档化的正式变量名（见 .env.example / README）
 * 2. `NEXT_PUBLIC_SITE_URL` — 旧名字，兼容历史部署；命中时 console.warn 提示迁移
 * 3. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel 在自定义域名生效后自动注入
 *    （无协议，需补 `https://`）。在 Vercel 生产环境与正式变量同值
 * 4. `VERCEL_URL` — Vercel 部署 URL（无协议）。生产/预览都会设置；
 *    预览环境用这个会是临时 URL，仅作为最后兜底
 * 5. 全部缺失 → 抛错（fail loud，便于运维发现）
 *
 * 注：兜底分支会 `console.warn`，避免「静默成功」式隐藏问题。
 */
function resolveSiteUrl(): string {
  if (isDev) return 'http://localhost:3000';

  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl;

  const legacy = process.env.NEXT_PUBLIC_SITE_URL;
  if (legacy) {
    console.warn(
      `[url] 检测到旧变量 NEXT_PUBLIC_SITE_URL,已兼容使用。` +
        `建议迁移到正式变量 APP_URL(.env.example / README 已统一)。` +
        `值: ${legacy}`,
    );
    return legacy;
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    console.warn(
      `[url] APP_URL 未设置,使用 Vercel VERCEL_PROJECT_PRODUCTION_URL 兜底: https://${vercelProd}` +
        `。建议在 Vercel Project Settings 中显式设置 APP_URL 以便 canonical 稳定。`,
    );
    return `https://${vercelProd}`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    console.warn(
      `[url] APP_URL / VERCEL_PROJECT_PRODUCTION_URL 均未设置,使用 VERCEL_URL 兜底(可能是预览部署): https://${vercelUrl}` +
        `。建议在 Vercel Project Settings 中显式设置 APP_URL。`,
    );
    return `https://${vercelUrl}`;
  }

  // next build 阶段如果没有任何 URL 环境变量,返回占位 URL 让 build 走通
  // 运行时仍会抛错,所以生产部署不受影响(运维必须在 Vercel 设置 APP_URL)
  if (isBuilding) return 'https://example.com';

  throw new Error(
    '生产环境必须设置 APP_URL(优先)或 NEXT_PUBLIC_SITE_URL(已弃用)或 VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL 之一',
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
