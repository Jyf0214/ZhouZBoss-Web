import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
};

const withNextIntl = createNextIntlPlugin('./i18n/config.ts');

export default withNextIntl(nextConfig);
