import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cnas.ro',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Serve local PDF files
  async rewrites() {
    return [
      {
        source: '/data/pdfs/:path*',
        destination: '/api/pdfs/:path*',
      },
    ]
  },
}

export default nextConfig
