import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // 允许访问远程图片占位符
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // 允许该主机名下的任何路径
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  // 禁用 Turbopack 以避免 NFT 警告
  // 使用 webpack 而不是 turbopack
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, {dev}: any) => {
    // 在 AI Studio 中通过 DISABLE_HMR 环境变量禁用 HMR
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
