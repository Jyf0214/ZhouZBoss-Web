import type {NextConfig} from 'next';

export interface SiteConfig {
  title: string;
  description: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  lang: string;
}

export interface AppearanceConfig {
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

export interface UserConfig {
  avatar?: string;
}

export interface AppConfig {
  site: SiteConfig;
  appearance: AppearanceConfig;
  access: AccessConfig;
  auth: AuthConfig;
  users?: Record<string, UserConfig>;
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

export default nextConfig;