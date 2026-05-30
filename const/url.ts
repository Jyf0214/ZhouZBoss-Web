/**
 * 站点 URL 常量
 */

const isDev = process.env.NODE_ENV === 'development';

/** 站点根地址 */
export const SITE_URL = isDev
  ? 'http://localhost:3000'
  : (process.env.NEXT_PUBLIC_SITE_URL ?? (() => { throw new Error('生产环境必须设置 NEXT_PUBLIC_SITE_URL 环境变量'); })());

/** 站点域名 */
export const SITE_DOMAIN = (() => {
  try { return new URL(SITE_URL).hostname; } catch { return 'localhost'; }
})();

/** 隐私政策页 */
export const PRIVACY_URL = '/privacy';

/** 服务条款页 */
export const TERMS_URL = '/terms';

/** 生成站点图片路径 */
export const imageUrl = (filename: string) => `/images/${filename}`;
