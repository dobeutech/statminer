/** @type {import('next').NextConfig} */

const nextConfig = {
  // Use static export for zero-cost hosting
  // Comment this out if you need API routes on Vercel
  output: 'export',
  trailingSlash: true,
  
  images: {
    unoptimized: true,
  },
  
  // Disable server-side features for static export
  // All LLM calls happen client-side with user's API keys
  
  webpack: (config, { isServer }) => {
    // Polyfills for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        dns: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

// Only wrap with Sentry if configured
const { withSentryConfig } = require('@sentry/nextjs');

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

// Export with or without Sentry based on environment
module.exports = process.env.SENTRY_DSN 
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
