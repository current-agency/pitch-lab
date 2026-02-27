import type { NextConfig } from 'next'

function getCmsImageRemotePatterns(): { protocol: 'http' | 'https'; hostname: string; port: string; pathname: string }[] {
  const patterns: { protocol: 'http' | 'https'; hostname: string; port: string; pathname: string }[] = [
    { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/**' },
  ]
  const cmsUrl = process.env.CMS_URL
  if (cmsUrl) {
    try {
      const u = new URL(cmsUrl)
      const protocol = u.protocol === 'https:' ? 'https' : 'http'
      patterns.push({ protocol, hostname: u.hostname, port: u.port || '', pathname: '/**' })
    } catch {
      // ignore invalid CMS_URL
    }
  }
  return patterns
}

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  images: {
    remotePatterns: getCmsImageRemotePatterns(),
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/logo.svg' }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
