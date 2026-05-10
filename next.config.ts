import type {NextConfig} from 'next';

interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

interface AppearanceConfig {
  background: {
    url: string;
    opacity: number;
  };
  customCSS: string;
  customHead: string;
  loading?: {
    type: 'spinner' | 'text' | 'dots' | 'glow' | 'waves';
  };
}

interface AccessConfig {
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

interface AuthConfig {
  allowRegistration: boolean;
  admin?: {
    avatar?: string;
  };
}

interface UserConfig {
  avatar?: string;
}

interface AppConfig {
  site: SiteConfig;
  appearance: AppearanceConfig;
  access: AccessConfig;
  auth: AuthConfig;
  users?: Record<string, UserConfig>;
}

const appConfig: AppConfig = {
  site: {
    title: 'Originium Kernel',
    description: '现代内容发布平台',
    heroTitleLine1: '书写。同步。',
    heroTitleLine2: '部署。',
    lang: 'zh-CN',
  },
  appearance: {
    background: { url: '', opacity: 0.8 },
    customCSS: '',
    customHead: '',
    loading: { type: 'spinner' },
  },
  access: {
    posts: { public: ['*'], private: [] },
    faces: { public: [], private: ['*'] },
    diary: { public: [], private: ['*'] },
  },
  auth: {
    allowRegistration: true,
  },
};

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, {dev}: {dev?: boolean}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export { appConfig, type AppConfig, type SiteConfig, type AppearanceConfig, type AccessConfig, type AuthConfig, type UserConfig };
export default nextConfig;