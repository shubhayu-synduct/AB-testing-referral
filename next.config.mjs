/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  swcMinify: false,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Ignore build errors for specific pages
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Remove console statements in production builds
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Remove console.log, console.info, console.warn in production client builds
      // Keep console.error for critical error reporting
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor && minimizer.constructor.name === 'TerserPlugin') {
          // Disable parallel workers to avoid EPERM kill issues on Windows
          minimizer.options.parallel = false;
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              ...minimizer.options.terserOptions?.compress,
              drop_console: ['log', 'info', 'warn'],
            },
          };
        }
      });
    }
    return config;
  },
}

export default nextConfig
