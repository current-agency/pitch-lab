import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/logo.svg' }]
  },
}

export default nextConfig
