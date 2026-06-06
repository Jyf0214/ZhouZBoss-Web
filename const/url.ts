/**
 * 站点 URL 常量
 */

const isDev = process.env.NODE_ENV === 'development';

/** 站点根地址（惰性求值，仅实际使用时才检查环境变量） */
function resolveSiteUrl(): string {
  if (isDev) return 'http://localhost:3000';
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error('生产环境必须设置 NEXT_PUBLIC_SITE_URL 环境变量');
  return url;
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
