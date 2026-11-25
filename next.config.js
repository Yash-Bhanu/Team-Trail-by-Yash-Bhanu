/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Disable source maps in production
  productionBrowserSourceMaps: false,

  // Security: Custom headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // Prevent access to sensitive files
        source: '/:path(.env|.env.*|.git|.gitignore|docker-compose.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ];
  },

  // Security: Restrict rewrites
  async rewrites() {
    return [];
  },

  // Strict React mode
  reactStrictMode: true,

  // Server external packages (server-only modules)
  serverExternalPackages: ['pino', 'pino-pretty'],

  // Logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;
