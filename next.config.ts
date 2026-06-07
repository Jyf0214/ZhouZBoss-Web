import type {NextConfig} from 'next';

export interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

export interface AppearanceConfig {
  /** 全局基础字号（px），默认 16，可在网页端配置 */
  fontSize?: number;
  background: {
    url: string;
    opacity: number;
  };
  customCSS: string;
  customHead: string;
  loading?: {
    page?: {
      type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
      color?: string;
      position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    navigation?: {
      type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves' | 'antd';
      color?: string;
    };
    slogans?: string[];
  };
}

export interface AccessConfig {
  posts: {
    public: string[];
    private: string[];
  };
  faces: {
    public: string[];
    private: string[];
  };
  diary: {
    public: string[];
    private: string[];
  };
}

export interface AuthConfig {
  allowRegistration: boolean;
  admin?: {
    avatar?: string;
  };
}

export interface NavMenuItem {
  name: string;
  link: string;
  icon?: string;
}

export interface NavMenuGroup {
  title: string;
  item: NavMenuItem[];
}

export interface NavConfig {
  enable: boolean;
  travelling: boolean;
  clock: boolean;
  menu: NavMenuGroup[];
}

export interface MournConfig {
  enable: boolean;
  days: string[];
}

export interface HighlightConfig {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
}

export interface CopyConfig {
  enable: boolean;
  copyright: {
    enable: boolean;
    limitCount: number;
  };
}

export type SocialConfig = Record<string, string>;

export interface AuthorStatusConfig {
  enable: boolean;
  statusImg: string;
  skills: string[];
}

export interface CoverConfig {
  indexEnable: boolean;
  asideEnable: boolean;
  archivesEnable: boolean;
  position: 'left' | 'right' | 'both';
  defaultCover: string[];
}

export interface ErrorImgConfig {
  flink: string;
  postPage: string;
}

export interface PostMetaDisplayConfig {
  dateType: 'created' | 'updated' | 'both';
  dateFormat: 'date' | 'relative' | 'simple';
  categories: boolean;
  tags: boolean;
  label: boolean;
}

export interface PostMetaPostConfig extends PostMetaDisplayConfig {
  unread: boolean;
}

export interface PostMetaConfig {
  page: PostMetaDisplayConfig & { dateFormat: 'date' | 'relative' | 'simple' };
  post: PostMetaPostConfig;
}

export interface WordCountConfig {
  enable: boolean;
  postWordcount: boolean;
  min2read: boolean;
  totalWordcount: boolean;
}

export interface TocConfig {
  post: boolean;
  page: boolean;
  number: boolean;
  expand: boolean;
  styleSimple: boolean;
}

export interface CopyrightConfig {
  enable: boolean;
  decode: boolean;
  authorHref: string;
  location: string;
  license: string;
  licenseUrl: string;
  avatarSinks: boolean;
  authorImgBack: string;
  authorImgFront: string;
  authorLink: string;
}

export interface QRCodeItem {
  img: string;
  link: string;
  text: string;
}

export interface RewardConfig {
  enable: boolean;
  qrCodes: QRCodeItem[];
}

export interface PostEditConfig {
  enable: boolean;
  github: string | false;
}

export interface SharejsConfig {
  enable: boolean;
  sites: string;
}

export interface AddtoanyConfig {
  enable: boolean;
  item: string;
}

export interface ShareConfig {
  sharejs: SharejsConfig;
  addtoany: AddtoanyConfig;
}

export interface MainToneConfig {
  enable: boolean;
  mode: 'cdn' | 'api' | 'both';
}

export interface FooterOwnerConfig {
  enable: boolean;
  since: number;
  author?: string;
}

export interface FooterRuntimeConfig {
  enable: boolean;
  launchTime: string;
}

export interface FooterSocialLink {
  name: string;
  icon: string;
}

export interface FooterLinkItem {
  name: string;
  url: string;
}

export interface FooterLinkGroup {
  group: string;
  items: FooterLinkItem[];
}

export interface FooterBadge {
  name: string;
  url: string;
}

export interface FooterConfig {
  owner: FooterOwnerConfig;
  customText: string;
  runtime: FooterRuntimeConfig;
  avatar?: string;
  socialLinks?: FooterSocialLink[];
  links?: FooterLinkGroup[];
  badges?: FooterBadge[];
  typedTextPrefix?: string;
  typedText?: string[];
}

export interface ClerkConfig {
  enable: boolean;
}

export interface UserConfig {
  avatar?: string;
}

export interface AppConfig {
  site: SiteConfig;
  appearance: AppearanceConfig;
  access: AccessConfig;
  auth: AuthConfig;
  nav?: NavConfig;
  mourn?: MournConfig;
  highlight?: HighlightConfig;
  copy?: CopyConfig;
  social?: SocialConfig;
  authorStatus?: AuthorStatusConfig;
  cover?: CoverConfig;
  errorImg?: ErrorImgConfig;
  postMeta?: PostMetaConfig;
  wordcount?: WordCountConfig;
  toc?: TocConfig;
  copyright?: CopyrightConfig;
  reward?: RewardConfig;
  postEdit?: PostEditConfig;
  share?: ShareConfig;
  mainTone?: MainToneConfig;
  footer?: FooterConfig;
  clerk?: ClerkConfig;
  users?: Record<string, UserConfig>;
}

/**
 * 构建期 URL 健康检查
 *
 * 目的：在 `next build` 阶段主动探测 `NEXT_PUBLIC_SITE_URL` 是否配置，
 * 缺失时打 loud warning（在 build 日志里显眼），
 * 但不阻断构建（运行时还有 Vercel env 兜底）。
 *
 * 触发条件：
 * - NODE_ENV === 'production'（即 `next build`）
 * - NEXT_PUBLIC_SITE_URL 未设置
 * - VERCEL === '1'（即在 Vercel 上构建，本地生产构建不警告）
 */
if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1' && !process.env.NEXT_PUBLIC_SITE_URL) {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const fallback = vercelProd ? `VERCEL_PROJECT_PRODUCTION_URL=${vercelProd}` : vercelUrl ? `VERCEL_URL=${vercelUrl}` : 'NONE';
  // 用 console.warn 配合醒目的 '⚠' 前缀,确保在 build log 里可被 grep
  console.warn(
    `\n` +
      `╔══════════════════════════════════════════════════════════════════╗\n` +
      `║  ⚠  NEXT_PUBLIC_SITE_URL 未设置                                       ║\n` +
      `╠══════════════════════════════════════════════════════════════════╣\n` +
      `║  运行时将自动回退到 ${fallback.padEnd(40)}║\n` +
      `║  建议在 Vercel Project Settings → Environment Variables 显式设置: ║\n` +
      `║    NEXT_PUBLIC_SITE_URL = https://zhou-z-boss.castorice.giize.com  ║\n` +
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