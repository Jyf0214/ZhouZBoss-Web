/**
 * URL Constants
 * 
 * URL 常量配置 - 参考 LobeChat const
 * @author LobeChat Team
 * @copyright LobeHub. All rights reserved.
 */

// 环境判断
const isDev = process.env.NODE_ENV === 'development';

// 官方 URL（可配置为实际部署地址）
export const OFFICIAL_URL = isDev ? 'http://localhost:3000' : 'https://your-domain.com';
export const OFFICIAL_SITE = OFFICIAL_URL;
export const OFFICIAL_DOMAIN = new URL(OFFICIAL_URL).hostname;

// 隐私政策和服务条款
export const PRIVACY_URL = '/privacy';
export const TERMS_URL = '/terms';

// 图片 URL
export const imageUrl = (filename: string) => `/images/${filename}`;
