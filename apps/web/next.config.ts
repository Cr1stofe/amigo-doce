import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  async headers() {
    return [{ source: '/reveal/:token', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
};
export default config;
