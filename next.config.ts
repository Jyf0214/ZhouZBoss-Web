import type {NextConfig} from 'next';

// 所有 AppConfig 相关类型统一定义在 lib/config-schema.ts,
// 这里仅做 re-export 以保持对旧 import 路径 (@/next.config) 的向后兼容。
export type {
  AppConfig,
  SiteConfig,
  AppearanceConfig,
  AccessConfig,
  AccessSection,
  AuthConfig,
  NavMenuItem,
  NavMenuGroup,
  NavConfig,
  MournConfig,
  HighlightConfig,
  CopyConfig,
  SocialConfig,
  AuthorStatusConfig,
  CoverConfig,
  ErrorImgConfig,
  PostMetaDisplayConfig,
  PostMetaPostConfig,
  PostMetaConfig,
  WordCountConfig,
  TocConfig,
  CopyrightConfig,
  QRCodeItem,
  RewardConfig,
  PostEditConfig,
  SharejsConfig,
  AddtoanyConfig,
  ShareConfig,
  MainToneConfig,
  FooterOwnerConfig,
  FooterRuntimeConfig,
  FooterSocialLink,
  FooterLinkItem,
  FooterLinkGroup,
  FooterBadge,
  FooterConfig,
  ClerkConfig,
  UserConfig,
} from './lib/config-schema';

/**
 * 构建期 URL 健康检查
 *
 * 目的：在 `next build` 阶段主动探测 `APP_URL`（正式变量名）是否配置，
 * 缺失时打 loud warning（在 build 日志里显眼），
 * 但不阻断构建（运行时还有 Vercel env 兜底）。
 *
 * 触发条件：
 * - NODE_ENV === 'production'（即 `next build`）
 * - APP_URL 未设置（且 NEXT_PUBLIC_SITE_URL 旧名也未设置）
 * - VERCEL === '1'（即在 Vercel 上构建，本地生产构建不警告）
 */
if (
  process.env.NODE_ENV === 'production' &&
  process.env.VERCEL === '1' &&
  !process.env.APP_URL &&
  !process.env.NEXT_PUBLIC_SITE_URL
) {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const fallback = vercelProd ? `VERCEL_PROJECT_PRODUCTION_URL=${vercelProd}` : vercelUrl ? `VERCEL_URL=${vercelUrl}` : 'NONE';
  // 用 console.warn 配合醒目的 '⚠' 前缀,确保在 build log 里可被 grep
  console.warn(
    `\n` +
      `╔══════════════════════════════════════════════════════════════════╗\n` +
      `║  ⚠  APP_URL 未设置                                                 ║\n` +
      `╠══════════════════════════════════════════════════════════════════╣\n` +
      `║  运行时将自动回退到 ${fallback.padEnd(40)}║\n` +
      `║  建议在 Vercel Project Settings → Environment Variables 显式设置: ║\n` +
      `║    APP_URL = https://zhou-z-boss.castorice.giize.com            ║\n` +
      `║  否则社交分享(og:url)、版权链接、构建预览等会使用临时 URL,    ║\n` +
      `║  影响 SEO 与分享稳定性。                                       ║\n` +
      `╚══════════════════════════════════════════════════════════════════╝\n`,
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  turbopack: {},
  webpack: (config: { watchOptions?: { ignored?: RegExp } }, {dev}: {dev?: boolean}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
